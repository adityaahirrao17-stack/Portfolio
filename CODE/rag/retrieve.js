// Hybrid retrieval over rag/index.json: vector similarity (meaning) blended
// with BM25 (exact terms). MiniLM embeddings miss short exact terms like
// "PyTorch" or "CGPA"; BM25 catches those. Both scores are normalised to 0..1
// and averaged. Used by ask.js in the browser; also runnable in Node for tests.

const STOP = new Set(('a an and are as at be by did do does for from has have he his how i in is it its me my of on or so ' +
  'that the their this to was were what when where which who why will with you your about tell aditya into any can').split(' '));

export function tokens(text) {
  return text.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').split(' ')
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}

export function createRetriever(index) {
  const chunks = index.chunks;
  const tfs = chunks.map((c) => {
    const tf = new Map();
    for (const t of tokens(`${c.title} ${c.text}`)) tf.set(t, (tf.get(t) || 0) + 1);
    return tf;
  });
  const lens = tfs.map((tf) => [...tf.values()].reduce((a, b) => a + b, 0));
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  const df = new Map();
  for (const tf of tfs) for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);

  function bm25(query, k1 = 1.4, b = 0.75) {
    const q = [...new Set(tokens(query))];
    const n = chunks.length;
    return tfs.map((tf, i) => q.reduce((s, t) => {
      const f = tf.get(t);
      if (!f) return s;
      const idf = Math.log(1 + (n - df.get(t) + 0.5) / (df.get(t) + 0.5));
      return s + idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * lens[i] / avg));
    }, 0));
  }

  // queryVector: normalised embedding of the question, or null to use BM25 alone.
  // Returns [] when nothing is relevant: no keyword in common and best cosine
  // similarity under `minSimilarity` (measured: real questions score >= 0.27,
  // off-topic ones like "write me a poem" <= 0.15).
  return function retrieve(query, queryVector, { k = 4, keywordWeight = 0.5, minScore = 0.15, minSimilarity = 0.22 } = {}) {
    const kw = bm25(query);
    const sims = queryVector ? chunks.map((c) => c.embedding.reduce((s, x, j) => s + x * queryVector[j], 0)) : null;
    if (!(Math.max(...kw) > 0 || (sims && Math.max(...sims) >= minSimilarity))) return [];
    const kmax = Math.max(...kw) || 1;
    // below 0.1 cosine is treated as unrelated
    const vec = sims ? sims.map((s) => Math.max(0, s - 0.1)) : chunks.map(() => 0);
    const vmax = Math.max(...vec) || 1;
    const w = queryVector ? keywordWeight : 1;
    return chunks
      .map((c, i) => ({ chunk: c, score: (1 - w) * vec[i] / vmax + w * kw[i] / kmax }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .filter((r) => r.score > minScore)
      .map((r) => r.chunk);
  };
}
