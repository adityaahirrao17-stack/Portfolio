// Runs the WebLLM engine off the main thread so the page stays smooth while
// the model loads and generates. ask.js talks to it via CreateWebWorkerMLCEngine.
import { WebWorkerMLCEngineHandler } from 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => handler.onmessage(msg);
