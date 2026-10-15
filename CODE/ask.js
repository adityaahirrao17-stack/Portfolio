/* =====================================================================
   ASK.JS — "Ask my portfolio", a RAG pipeline that runs entirely in the
   visitor's browser. No server, no API key.

   1. Retrieval: rag/index.json holds every resume/portfolio section with
      its all-MiniLM-L6-v2 embedding (built by rag/build-index.mjs). The
      question is embedded in the browser with Transformers.js and matched
      by hybrid search (vectors + BM25, see rag/retrieve.js). Until the
      23 MB embedding model has loaded, keyword search alone is used.
   2. Answer: by default the best-matching passages are shown, cited.
      On devices with WebGPU, visitors can turn on AI answers: WebLLM
      downloads Qwen2.5-1.5B once (~1 GB, cached by the browser) and
      writes a cited answer from the same passages, on the device.
   ===================================================================== */
import { createRetriever, tokens } from './rag/retrieve.js';

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm';
const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm';
const MODEL_F16 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const MODEL_F32 = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';   // for GPUs without 16-bit float shaders
const PREF_KEY = 'askAI';

const SYSTEM =
  "You are the assistant on Aditya Ahirrao's portfolio website. " +
  "Answer the visitor's question using only the numbered passages. " +
  'After each sentence, cite the passage that supports it with its number in square brackets, like [1]. ' +
  "If the passages do not contain the answer, say you don't have that information and suggest the contact form on the website. " +
  'Refer to Aditya in the third person. Reply in two to four short sentences of plain text, with no lists, headings or markdown. ' +
  'If the question is not about Aditya, his work, skills, education or hiring him, politely say you can only answer questions about him.';

const $ = (sel) => document.querySelector(sel);
const section = $('#ask');
const form = $('#askForm');

if (section && form) init();

function init() {
  const input = $('#askInput');
  const log = $('#askLog');
  const status = $('#askStatus');
  const aiBox = $('#askAI');
  const aiBtn = $('#askAIBtn');
  const aiNote = $('#askAINote');
  const aiBar = $('#askAIBar');
  const chips = [...document.querySelectorAll('#askChips button')];

  let retrieve = null;
  let embed = null;             // text -> Float32Array once the embedding model has loaded
  let engine = null;            // WebLLM engine once AI answers are on
  let modelId = null;           // chosen WebLLM model, null if the device can't run one
  let busy = false;
  let lastQuestion = '';

  const node = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const setStatus = (state, text) => { status.className = 'ask__status is-' + state; status.textContent = text; };
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };
  const store = (v) => { try { v ? localStorage.setItem(PREF_KEY, '1') : localStorage.removeItem(PREF_KEY); } catch (e) { /* storage blocked */ } };
  const wanted = () => { try { return localStorage.getItem(PREF_KEY) === '1'; } catch (e) { return false; } };
  function setBusy(on) {
    busy = on;
    form.querySelector('button').disabled = on;
    chips.forEach((b) => { b.disabled = on; });
  }

  setStatus('waking', 'Loading my resume index…');
  const ready = fetch(new URL('rag/index.json', import.meta.url))
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((index) => {
      retrieve = createRetriever(index);
      setStatus('on', 'Answers come from my resume, matched in your browser');
      loadEmbedder(index);
      return index;
    })
    .catch(() => setStatus('off', 'The resume index could not be loaded'));

  // The embedding model (~23 MB) loads in the background; questions asked
  // before it is ready use keyword search instead of waiting for it.
  function loadEmbedder(index) {
    import(TRANSFORMERS_URL)
      .then(({ pipeline }) => pipeline('feature-extraction', index.model, { dtype: index.dtype }))
      .then((extract) => { embed = async (text) => (await extract(text, { pooling: 'mean', normalize: true })).data; })
      .catch((err) => console.warn('Embedding model unavailable, using keyword search only.', err));
  }

  // ---- AI answers (WebGPU only) ---------------------------------------
  (async function detectGPU() {
    try {
      if (!navigator.gpu) return;
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return;
      modelId = adapter.features.has('shader-f16') ? MODEL_F16 : MODEL_F32;
    } catch (e) { return; }
    aiBox.hidden = false;
    let cached = false;
    try { cached = await (await import(WEBLLM_URL)).hasModelInCache(modelId); } catch (e) { /* treat as not cached */ }
    aiNote.textContent = cached
      ? 'Already downloaded on this device · runs locally, nothing is sent anywhere'
      : 'Runs on your device · one-time ~1 GB download, then cached';
    if (wanted()) enableAI();
  })();

  async function enableAI() {
    if (engine || !modelId) return;
    aiBtn.disabled = true;
    aiBtn.textContent = 'Loading model…';
    aiBox.classList.add('is-loading');
    try {
      const { CreateWebWorkerMLCEngine, prebuiltAppConfig } = await import(WEBLLM_URL);
      const start = (cacheBackend) => CreateWebWorkerMLCEngine(
        new Worker(new URL('ask-worker.js', import.meta.url), { type: 'module' }),
        modelId,
        {
          appConfig: { ...prebuiltAppConfig, cacheBackend },
          initProgressCallback: (report) => {
            aiBar.style.setProperty('--p', Math.round((report.progress || 0) * 100) + '%');
            aiNote.textContent = report.text;
          },
        },
      );
      try {
        engine = await start('cache');
      } catch (err) {
        // Cache Storage can be unavailable (private windows, low disk); IndexedDB often still works
        console.warn('Cache Storage failed, retrying with IndexedDB.', err);
        engine = await start('indexeddb');
      }
      store(true);
      aiBox.classList.remove('is-loading');
      aiBox.classList.add('is-on');
      aiBtn.textContent = 'AI answers on';
      aiNote.textContent = 'Qwen2.5 1.5B is running on your device · nothing leaves your browser';
    } catch (err) {
      console.error(err);
      engine = null;
      store(false);
      aiBox.classList.remove('is-loading');
      aiBtn.disabled = false;
      aiBtn.textContent = 'Try again';
      aiNote.textContent = 'The model could not start on this device, so answers will show the matching passages.';
    }
  }
  aiBtn.addEventListener('click', enableAI);

  // ---- answering --------------------------------------------------------
  async function search(query) {
    let vector = null;
    if (embed) { try { vector = Array.from(await embed(query)); } catch (e) { vector = null; } }
    return retrieve(query, vector);
  }

  async function findPassages(question) {
    await ready;
    if (!retrieve) return [];
    const found = await search(question);
    // a follow-up like "and when was that?" finds nothing alone; add the previous
    // question, but only when it reads like a follow-up (not "write me a poem")
    const followUp = /^(and|so|what about|how about)\b|\b(he|his|him|that|this|it|there|those|they|also|more|else)\b/i;
    if (!found.length && lastQuestion && followUp.test(question)) return search(`${lastQuestion} ${question}`);
    return found;
  }

  // Without a model: quote the most relevant sentences of the top passages.
  function snippetAnswer(question, passages) {
    if (!passages.length) {
      return "I couldn't find that in my resume or portfolio. Try asking about Aditya's experience, projects, skills or leadership, or use the contact form below.";
    }
    const want = new Set(tokens(question));
    return passages.slice(0, 2).map((p, i) => {
      const sentences = p.text.match(/[^.!?]+[.!?]+(\s|$)/g) || [p.text];
      // first matching sentence plus the one after it, so a heading-like
      // match ("Intern at HAL, Nashik...") is followed by what was done
      const first = Math.max(0, sentences.findIndex((s) => tokens(s).some((t) => want.has(t))));
      const pick = sentences.slice(first, first + 2).join(' ').trim();
      return `${pick} [${i + 1}]`;
    }).join(' ');
  }

  async function aiAnswer(question, passages, onText) {
    const context = passages.map((p, i) => `Passage ${i + 1} (${p.source}):\n${p.title}. ${p.text}`).join('\n\n') || '(no relevant passages found)';
    const stream = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `${context}\n\nVisitor's question: ${question}\n\nAnswer in your own words in two to four sentences, citing passage numbers like [1]. Do not copy the passages.` },
      ],
      temperature: 0.2,
      max_tokens: 220,
      stream: true,
    });
    let text = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
      if (delta) { text += delta; onText(text); }
    }
    return text;
  }

  // Turn "...text [2] more [1]" into text plus numbered tags and a source list.
  function render(li, text, passages) {
    li.textContent = '';
    const labels = passages.map((p) => `${p.source} · ${p.title}`);
    const used = [];
    const re = /\s*\[(\d+)\]/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      li.appendChild(document.createTextNode(text.slice(last, m.index)));
      last = re.lastIndex;
      const i = parseInt(m[1], 10) - 1;
      if (i < 0 || i >= labels.length) continue;   // drop marks the model invented
      let n = used.indexOf(i);
      if (n === -1) { used.push(i); n = used.length - 1; }
      const sup = node('sup', null, String(n + 1));
      sup.title = labels[i];
      li.appendChild(sup);
    }
    li.appendChild(document.createTextNode(text.slice(last)));
    if (used.length) {
      const list = node('ul', 'ask__src');
      list.setAttribute('aria-label', 'Sources');
      used.forEach((i, n) => {
        const item = node('li');
        item.appendChild(node('b', null, `[${n + 1}]`));
        item.appendChild(document.createTextNode(labels[i]));
        list.appendChild(item);
      });
      li.appendChild(list);
    }
  }

  async function send(question) {
    question = question.trim();
    if (!question || busy) return;
    setBusy(true);
    log.appendChild(node('li', 'ask__q', question));
    const answer = node('li', 'ask__a is-wait');
    log.appendChild(answer);
    scrollDown();

    try {
      const passages = await findPassages(question);
      let text;
      // nothing relevant: answer with the fixed "couldn't find" reply rather than
      // asking the model to decline on an empty context
      if (engine && passages.length) {
        try {
          text = await aiAnswer(question, passages, (t) => { answer.textContent = t; scrollDown(); });
        } catch (err) {
          console.error('AI answer failed, showing passages instead.', err);
          text = '';
        }
      }
      if (!text || !text.trim()) {
        text = snippetAnswer(question, passages);
        answer.classList.add('is-snippet');
      }
      answer.classList.remove('is-wait');
      render(answer, text, passages);
      lastQuestion = question;
    } catch (err) {
      console.error(err);
      answer.classList.remove('is-wait');
      answer.classList.add('is-error');
      answer.textContent = 'Something went wrong. Please try again.';
    }
    setBusy(false);
    scrollDown();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(input.value);
    input.value = '';
  });
  chips.forEach((b) => b.addEventListener('click', () => send(b.textContent)));
}
