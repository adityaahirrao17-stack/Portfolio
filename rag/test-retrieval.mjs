// Prints which chunks the browser's retriever picks for sample questions.
//   cd rag && node test-retrieval.mjs
import fs from 'node:fs';
import { pipeline } from '@huggingface/transformers';
import { createRetriever } from '../CODE/rag/retrieve.js';

const index = JSON.parse(fs.readFileSync(new URL('../CODE/rag/index.json', import.meta.url)));
const retrieve = createRetriever(index);
const embed = await pipeline('feature-extraction', index.model, { dtype: index.dtype });

const questions = process.argv.slice(2).length ? process.argv.slice(2) : [
  'What did he build at HAL?', 'What leadership roles does he hold?', 'Which hackathons has he won?',
  'Where does he study?', 'Does he know PyTorch or computer vision?', 'What is his CGPA?',
  'Tell me about Swasthyam', 'Has he given any talks?', 'is he into sports', 'what is the weather today',
  'write me a poem about cats',
];
for (const q of questions) {
  const v = Array.from((await embed(q, { pooling: 'mean', normalize: true })).data);
  const hybrid = retrieve(q, v).map((c) => c.title.slice(0, 26));
  const kwOnly = retrieve(q, null).map((c) => c.title.slice(0, 26));
  console.log(`${q}\n   hybrid: ${JSON.stringify(hybrid)}\n   bm25:   ${JSON.stringify(kwOnly)}`);
}
