# Ask my portfolio: knowledge and index

The "Ask my portfolio" box on the website is a RAG pipeline that runs entirely in the visitor's browser. Nothing here is a server.

| Piece | Where | What it does |
|---|---|---|
| Knowledge | `rag/knowledge/` | Résumé and portfolio facts as Markdown (`## ` sections), plus LinkedIn exports |
| Index builder | `rag/build-index.mjs` | Embeds every section with all-MiniLM-L6-v2 and writes `CODE/rag/index.json` |
| Retrieval | `CODE/rag/retrieve.js` | Hybrid search in the browser: vector similarity + BM25 keywords |
| Answers | `CODE/ask.js`, `CODE/ask-worker.js` | Shows cited passages; with WebGPU, Qwen2.5-1.5B (via WebLLM) writes a cited answer on the visitor's device |

## Updating what it knows

1. Edit `knowledge/resume.md` or `knowledge/portfolio.md`, or drop LinkedIn CSV exports into `knowledge/linkedin/`.
2. Rebuild the index:
   ```bash
   cd rag
   npm install      # first time only
   npm run build
   ```
3. Commit `CODE/rag/index.json` and push. Vercel serves it as a static file.

`node test-retrieval.mjs "your question"` shows which sections a question retrieves.

## What it depends on

The page loads Transformers.js 4.3.0 and WebLLM 0.2.85 from cdn.jsdelivr.net, and the model weights from Hugging Face's public CDN on first use. All are free public file hosts; there is no account, key or paid service.
