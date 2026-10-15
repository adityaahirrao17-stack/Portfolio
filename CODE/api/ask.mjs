// POST /api/ask — answers questions about Aditya from the portfolio knowledge
// base. Retrieval picks the relevant chunks, Claude answers from only those
// chunks with citations turned on, and the client shows which chunk backs
// each sentence. Requires ANTHROPIC_API_KEY in the Vercel project settings.

import Anthropic from '@anthropic-ai/sdk';
import { retrieve } from './_retrieve.mjs';

const client = new Anthropic();

const SYSTEM = `You answer visitors' questions about Aditya Ahirrao on his portfolio website.
Use only the documents provided with each question. If they don't contain the answer, say you don't have that information and suggest using the contact form.
Refer to Aditya in the third person. Keep answers to two to four short sentences of plain prose: no headings, lists or markdown.
If a question is unrelated to Aditya, his work or hiring him, politely say you can only answer questions about him.`;

const MAX_QUESTION = 300;
const MAX_TURNS = 6;

// Best-effort per-instance limit; a warm function instance keeps this map.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'Too many questions at once. Try again in a minute.' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const question = String(body.question || '').trim().slice(0, MAX_QUESTION);
  if (!question) return res.status(400).json({ error: 'Ask a question first.' });

  // Earlier turns arrive as plain text from the browser; keep only well-formed ones.
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));
  if (history.length && history[0].role !== 'user') history.shift();

  const sources = retrieve(question);
  const documents = sources.map((s) => ({
    type: 'document',
    source: { type: 'text', media_type: 'text/plain', data: s.text },
    title: s.title,
    citations: { enabled: true },
  }));

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [...history, { role: 'user', content: [...documents, { type: 'text', text: question }] }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ parts: [{ text: "I can't help with that one. Try asking about Aditya's work or experience." }], sources: [] });
    }

    // Text blocks alternate between uncited and cited spans; keep the
    // citation as an index into `sources` so the page can label it.
    const parts = [];
    for (const block of response.content) {
      if (block.type !== 'text') continue;
      const cites = [...new Set((block.citations || [])
        .filter((c) => typeof c.document_index === 'number')
        .map((c) => c.document_index))];
      parts.push({ text: block.text, cites });
    }

    return res.status(200).json({ parts, sources: sources.map((s) => s.title) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'The assistant is busy. Try again in a moment.' });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('Anthropic auth failed — check ANTHROPIC_API_KEY');
      return res.status(500).json({ error: 'The assistant is not configured yet.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error', err.status, err.message);
      return res.status(502).json({ error: 'The assistant could not answer right now.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return {}; }
}
