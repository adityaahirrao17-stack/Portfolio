// Builds CODE/rag/index.json, the vector index the "Ask my portfolio" box
// searches in the visitor's browser.
//
//   cd rag && npm install && npm run build
//
// Reads every file in knowledge/:
//   *.md   one chunk per "## Heading" section; frontmatter `source:` names the file
//   *.csv  one chunk per row (LinkedIn data export files)
// Each chunk is embedded with all-MiniLM-L6-v2, the same model and settings
// the browser uses for questions (see CODE/ask.js), so the vectors match.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@huggingface/transformers';

export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBED_DTYPE = 'q8';

const here = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE = path.join(here, 'knowledge');
const OUT = path.join(here, '..', 'CODE', 'rag', 'index.json');

function mdChunks(file) {
  let text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let source = path.basename(file, '.md');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    const m = fm[1].match(/^source:\s*(.+)$/m);
    if (m) source = m[1].trim();
    text = text.slice(fm[0].length);
  }
  return text.split(/^## /m).map((b) => b.trim()).filter(Boolean).map((block) => {
    const nl = block.indexOf('\n');
    const title = (nl === -1 ? block : block.slice(0, nl)).trim();
    const body = (nl === -1 ? '' : block.slice(nl + 1)).replace(/\s+/g, ' ').trim();
    return { source, title, text: body };
  }).filter((c) => c.text);
}

function csvRows(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function csvChunks(file) {
  const [header, ...rows] = csvRows(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const source = `LinkedIn · ${path.basename(file, '.csv')}`;
  return rows.map((r, i) => {
    const rec = Object.fromEntries(header.map((h, j) => [h.trim(), (r[j] || '').trim()]));
    const fields = Object.entries(rec).filter(([k, v]) => k && v).map(([k, v]) => `${k}: ${v}`);
    const title = ['Title', 'Name', 'School Name', 'Company Name', 'First Name'].map((k) => rec[k]).find(Boolean) || `Entry ${i + 1}`;
    return { source, title, text: fields.join('; ') };
  }).filter((c) => c.text);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]).sort();
}

const chunks = [];
for (const file of walk(KNOWLEDGE)) {
  const ext = path.extname(file).toLowerCase();
  if (path.basename(file).toLowerCase() === 'readme.md') continue;
  const found = ext === '.md' ? mdChunks(file) : ext === '.csv' ? csvChunks(file) : null;
  if (!found) { console.warn(`skipped ${path.relative(here, file)} (only .md and .csv are read)`); continue; }
  console.log(`${path.relative(here, file)}: ${found.length} chunks`);
  chunks.push(...found);
}
if (!chunks.length) throw new Error('No knowledge found.');

const embed = await pipeline('feature-extraction', EMBED_MODEL, { dtype: EMBED_DTYPE });
for (const c of chunks) {
  // the heading is embedded with the body so "HAL" or "Swasthyam" match their section
  const out = await embed(`${c.title}. ${c.text}`, { pooling: 'mean', normalize: true });
  c.embedding = Array.from(out.data, (x) => Math.round(x * 1e4) / 1e4);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ model: EMBED_MODEL, dtype: EMBED_DTYPE, dim: chunks[0].embedding.length, chunks }));
console.log(`Wrote ${chunks.length} chunks to ${path.relative(path.join(here, '..'), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
