// Small BM25 retriever over the knowledge base. The corpus is a few dozen
// chunks, so an in-memory index built once per cold start is plenty.

import { KB } from './_kb.mjs';

const STOP = new Set('a an and are as at be by did do does for from has have he his how i in is it its me my of on or so that the their this to was were what when where which who why will with you your about tell aditya'.split(' '));

function tokens(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t));
}

const docs = KB.map((d) => {
  const terms = tokens(d.title + ' ' + d.title + ' ' + d.text);   // title counts double
  const tf = new Map();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
  return { ...d, tf, len: terms.length };
});
const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length;
const df = new Map();
for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);

export function retrieve(query, k = 4) {
  const q = [...new Set(tokens(query))];
  const k1 = 1.4, b = 0.75, N = docs.length;
  const scored = docs.map((d) => {
    let score = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avgLen));
    }
    return { doc: d, score };
  }).sort((x, y) => y.score - x.score);

  // Always include the profile so broad questions ("who is he?") still ground.
  const top = scored.filter((s) => s.score > 0).slice(0, k).map((s) => s.doc);
  if (!top.some((d) => d.id === 'profile')) top.push(docs.find((d) => d.id === 'profile'));
  return top.map(({ id, title, text }) => ({ id, title, text }));
}
