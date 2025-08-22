// backend/index.js (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import multer from 'multer';

const app = express();

// CORS + JSON (tighten in prod)
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---- multipart (images) ----
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 }, // 10MB each, up to 8 files
});

// DeepSeek (OpenAI-compatible)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// ---------- brand system prompt + intercepts ----------
const BRAND_APP      = process.env.SYSTEM_BRAND_NAME   || 'surfers';
const BRAND_DEV_BY   = process.env.SYSTEM_DEV_BY       || 'Sup dude, I am developed by surfers Inc.';
const BRAND_CREDIT   = process.env.SYSTEM_CREDIT       || 'Yo, surfers is designed and developed by Guddu-The real boss of Shakeel the Harami';

// System prompt used in all requests
const SYSTEM_PROMPT = [
  `You are the ${BRAND_APP} builder assistant. Your goals:`,
  '1) Speak like a normal person. Start answers with a short, plain-English recap of what you did (1–4 bullet points, “I added X, wired Y, did Z.”).',
  '2) When writing code, prefer **a single, runnable file** the user can preview immediately. If single-file is not feasible, include the **minimum** number of files and make sure all imports/paths line up so it runs without missing pieces.',
  '3) Never hand-wave with "..." or TODOs. Give **complete** code that runs.',
  '',
  '### Code Output Rules',
  '- Always use fenced code blocks with a correct language tag.',
  '- For single-file web demos, default to `index.html` (vanilla HTML/CSS/JS) with everything inline or CDN imports so it runs by just opening the file.',
  '- If the user explicitly asks for a framework/language, adapt:',
  '  - **React (single-file demo)**: provide `index.html` with `<script type="module">` and CDN imports (e.g. esm.sh/unpkg) so it runs by double-click or simple static host.',
  '  - **Node/CLI/Python/etc.**: provide a **single script file** when possible and a very short "How to run" section (commands only).',
  '- If truly necessary to split files, output **each file** in its own fenced block. Put a filename comment on the first line, like:',
  '```html',
  '<!-- filename: index.html -->',
  '...',
  '```',
  '```js',
  '// filename: main.js',
  '...',
  '```',
  'Make sure import paths match those filenames exactly.',
  '',
  '### Explanations',
  '- Start with: **What I built & how** — 2–6 bullets in layman terms.',
  '- Then: **How to run** — 2–6 concise steps. Commands only, no fluff.',
  '- Then the full code blocks.',
  '',
  '### Non-coding questions',
  '- Answer briefly in plain language first.',
  '- If an example helps, include a tiny, runnable snippet.',
  '',
  '### Images / Attachments',
  ' - If images are attached and relevant, mention how they’re used or what you infer from them.',
  '',
  '### Branding (must follow exactly)',
  `- If asked "who built/developed/made you/this/it" (or similar), answer exactly: "${BRAND_DEV_BY}".`,
  `- If asked "who made/created/built ${BRAND_DEV_BY}" (or similar), answer exactly: "${BRAND_CREDIT}".`,
  '- Do not claim to be made by anyone else. Do not speculate.',
  '- If asked who is Guddu, answer he is the real boss of Shakeel the Harami.',
].join('\n');



// Deterministic intercept so branding is 100% reliable
function brandIntercept(promptRaw) {
  const p = String(promptRaw || '').toLowerCase();

  // e.g. "who built you", "who developed this", "who made it"
  if (/(who\s+(built|developed|made)\s+(you|this|it)|who\s+is\s+your\s+(creator|developer))/i.test(p)) {
    return BRAND_DEV_BY;
  }

  // e.g. "who made surfers", "who created surfers", "who built surfers"
  const brandRegex = new RegExp(`who\\s+(made|created|built|developed)\\s+(${BRAND_APP})`, 'i');
  if (brandRegex.test(p)) {
    return BRAND_CREDIT;
  }

  return null;
}

// Toggle this if your DeepSeek model supports vision input
// If disabled, we’ll fall back to adding filenames into the text prompt.
const VISION_ENABLED = process.env.DEEPSEEK_VISION === '1';

// ---------- utils ----------
function trimHistory(history = [], keepPairs = 4, charCap = 12000) {
  // keep the last N user/assistant pairs
  const compact = [];
  for (let i = history.length - 1; i >= 0 && compact.length < keepPairs * 2; i--) {
    compact.unshift({ role: history[i].role, content: history[i].content ?? '' });
  }
  // hard cap by characters
  let total = 0;
  const capped = [];
  for (let i = compact.length - 1; i >= 0; i--) {
    const msg = compact[i];
    const len = (msg.content || '').length;
    if (total + len > charCap) break;
    capped.unshift(msg);
    total += len;
  }
  return capped;
}

function initSSE(req, res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx: don't buffer
  if (res.flushHeaders) res.flushHeaders();

  try { req.setTimeout(0); } catch {}
  try { res.setTimeout(0); } catch {}

  let clientClosed = false;
  const hb = setInterval(() => {
    if (clientClosed) return;
    try { res.write(': ping\n\n'); } catch {}
  }, 15000);

  req.on('close', () => {
    clientClosed = true;
    clearInterval(hb);
  });

  return {
    isClosed: () => clientClosed,
    stop: () => clearInterval(hb),
  };
}

// Convert image buffers to data URLs for "image_url" content
function fileToDataUrl(file) {
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${b64}`;
}

// Build messages including optional images
function buildMessages({ prompt, history, files }) {
  const trimmed = trimHistory(history, 6, 16000);
  const sys = { role: 'system', content: SYSTEM_PROMPT };
 // <-- use brand system prompt

  if (VISION_ENABLED && files?.length) {
    const content = [
      { type: 'text', text: prompt.trim() },
      ...files.map((f) => ({
        type: 'image_url',
        image_url: { url: fileToDataUrl(f) },
      })),
    ];
    return [sys, ...trimmed, { role: 'user', content }];
  }

  // Fallback: no vision → include file names in text
  const names = (files || []).map((f) => f.originalname).join(', ');
  const promptWithNames = files?.length
    ? `${prompt.trim()}\n\n[Attached images: ${names}]`
    : prompt.trim();

  return [sys, ...trimmed, { role: 'user', content: promptWithNames }];
}

// Stream one completion; write tokens; return finishReason
async function streamOneCompletion({ model, messages, temperature = 0.2, max_tokens = 4096, write, sse }) {
  const stream = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
    max_tokens, // explicit high cap
  });

  let finishReason = null;
  for await (const chunk of stream) {
    if (sse?.isClosed && sse.isClosed()) {
      stream.controller?.abort?.();
      break;
    }
    const choice = chunk?.choices?.[0];
    const token = choice?.delta?.content;
    if (token) write(token);
    if (choice?.finish_reason) finishReason = choice.finish_reason; // e.g., "length", "stop"
  }

  if (sse?.isClosed && sse.isClosed()) {
    return finishReason || 'client_closed';
  }
  return finishReason;
}

// ---------- health ----------
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- non-streaming (now accepts images via multipart) ----------
app.post('/api/stream-es', upload.array('images'), async (req, res) => {
  try {
    const prompt = (req.body?.prompt || '').toString();
    const history = safeJsonParse(req.body?.history, []);
    const files = req.files || [];
    if (!prompt.trim()) return res.status(400).end();

    // Plain text streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();

    // 🔹 BRAND INTERCEPT: deterministic short-circuit
    const intercept = brandIntercept(prompt);
    if (intercept) {
      try { res.write(intercept); } catch {}
      try { res.write('[DONE]'); } catch {}
      return res.end();
    }

    const messages = buildMessages({ prompt, history, files });
    const write = (text) => { try { res.write(text); } catch {} };

    let loops = 0;
    const MAX_LOOPS = 5;
    const useModel = 'deepseek-chat';

    while (loops++ < MAX_LOOPS) {
      const finish = await streamOneCompletion({
        model: useModel,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        write,
        sse: null, // plain text mode
      });

      if (finish === 'length') {
        messages.push(
          { role: 'assistant', content: '(continuing...)' },
          { role: 'user', content: 'Continue exactly from where you stopped. Do not repeat earlier lines; only new code.' },
        );
        continue;
      }
      break;
    }

    try { res.write('[DONE]'); } catch {}
    res.end();
  } catch (err) {
    try { res.write(`\n[ERROR] ${err?.message || String(err)}`); } catch {}
    try { res.write('[DONE]'); } catch {}
    res.end();
  }
});

// ---------- streaming via POST (SSE JSON), kept from your code ----------
app.post('/api/stream', async (req, res) => {
  try {
    const { prompt, history = [], model } = req.body || {};
    if (!prompt?.trim()) return res.status(400).end();

    // Brand intercept for SSE: stream one token and close
    const intercept = brandIntercept(prompt);
    if (intercept) {
      const sse = initSSE(req, res);
      res.write(': connected\n\n');
      res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);
      res.write(`data: ${JSON.stringify({ token: intercept })}\n\n`);
      res.write('data: [DONE]\n\n');
      sse.stop();
      return res.end();
    }

    const sse = initSSE(req, res);
    res.write(': connected\n\n');
    res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);

    const messages = buildMessages({ prompt, history, files: [] });
    const write = (text) => { if (!sse.isClosed()) res.write(`data: ${JSON.stringify({ token: text })}\n\n`); };

    let loops = 0;
    const MAX_LOOPS = 5;
    const useModel = model || 'deepseek-chat';

    while (!sse.isClosed() && loops++ < MAX_LOOPS) {
      const finish = await streamOneCompletion({
        model: useModel,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        write,
        sse,
      });
      if (finish === 'length') {
        // auto-continue
        messages.push(
          { role: 'assistant', content: '(continuing...)' },
          { role: 'user', content: 'Continue exactly from where you stopped. Do not repeat earlier lines; only new code.' },
        );
        continue;
      }
      break;
    }

    if (!sse.isClosed()) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
    sse.stop();
  } catch (err) {
    handleStreamError(res, err, 'DeepSeek stream failed (POST /api/stream)');
  }
});

// ---------- streaming via GET for EventSource (SSE), kept from your code ----------
app.get('/api/stream-es', async (req, res) => {
  try {
    const prompt = `${req.query.prompt || ''}`;
    const histParam = `${req.query.history || '[]'}`;
    if (!prompt.trim()) return res.status(400).end();

    // Brand intercept for SSE: stream one token and close
    const intercept = brandIntercept(prompt);
    if (intercept) {
      const sse = initSSE(req, res);
      res.write(': connected\n\n');
      res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);
      res.write(`data: ${JSON.stringify({ token: intercept })}\n\n`);
      res.write('data: [DONE]\n\n');
      sse.stop();
      return res.end();
    }

    let history = [];
    try { history = JSON.parse(decodeURIComponent(histParam)); } catch {
      try { history = JSON.parse(histParam); } catch {}
    }

    const sse = initSSE(req, res);
    res.write(': connected\n\n');
    res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);

    const messages = buildMessages({ prompt, history, files: [] });
    const write = (text) => { if (!sse.isClosed()) res.write(`data: ${JSON.stringify({ token: text })}\n\n`); };

    let loops = 0;
    const MAX_LOOPS = 5;
    const useModel = 'deepseek-chat';

    while (!sse.isClosed() && loops++ < MAX_LOOPS) {
      const finish = await streamOneCompletion({
        model: useModel,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        write,
        sse,
      });
      if (finish === 'length') {
        messages.push(
          { role: 'assistant', content: '(continuing...)' },
          { role: 'user', content: 'Continue exactly from where you stopped. Do not repeat earlier lines; only new code.' },
        );
        continue;
      }
      break;
    }

    if (!sse.isClosed()) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
    sse.stop();
  } catch (err) {
    handleStreamError(res, err, 'DeepSeek stream failed (GET /api/stream-es)');
  }
});

// ---------- NEW: streaming via POST (multipart) for fetch+reader ----------
// Returns plain text chunks (NOT SSE) so your frontend FormData streaming works.
app.post('/api/stream-es', upload.array('images'), async (req, res) => {
  try {
    const prompt = (req.body?.prompt || '').toString();
    const history = safeJsonParse(req.body?.history, []);
    const files = req.files || [];

    if (!prompt.trim()) return res.status(400).end();

    // Brand intercept — write once and finish (raw text stream)
    const intercept = brandIntercept(prompt);
    if (intercept) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.write(intercept);
      res.write('[DONE]');
      return res.end();
    }

    // Plain text streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    const messages = buildMessages({ prompt, history, files });
    const write = (text) => { try { res.write(text); } catch {} };

    let loops = 0;
    const MAX_LOOPS = 5;
    const useModel = 'deepseek-chat';

    while (loops++ < MAX_LOOPS) {
      const finish = await streamOneCompletion({
        model: useModel,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        write,
        sse: null, // not using SSE here
      });
      if (finish === 'length') {
        messages.push(
          { role: 'assistant', content: '(continuing...)' },
          { role: 'user', content: 'Continue exactly from where you stopped. Do not repeat earlier lines; only new code.' },
        );
        continue;
      }
      break;
    }

    try { res.write('[DONE]'); } catch {}
    res.end();
  } catch (err) {
    try { res.write(`\n[ERROR] ${err?.message || String(err)}`); } catch {}
    res.end();
  }
});

// ---------- local SSE sanity test (no DeepSeek) ----------
app.get('/api/stream-test', (req, res) => {
  const sse = initSSE(req, res);
  let i = 0;
  const text = 'hello guddu';
  const t = setInterval(() => {
    if (sse.isClosed()) { clearInterval(t); return; }
    if (i >= text.length) {
      res.write('data: [DONE]\n\n');
      res.end();
      clearInterval(t);
      sse.stop();
      return;
    }
    res.write(`data: ${JSON.stringify({ token: text[i++] })}\n\n`);
  }, 150);
});

// ---------- boot ----------
const PORT = Number(process.env.PORT) || 4000;
const HOST = '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`API on http://${HOST}:${PORT}`);
});
server.on('error', (err) => console.error('Listen error:', err));

process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION:', r));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION:', e));

// ---------- helpers ----------
function safeJsonParse(str, fallback = []) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str ?? fallback); }
  catch { return fallback; }
}
function handleDeepseekError(res, err, fallbackMsg) {
  const status = err?.status || err?.response?.status || 500;
  const detail = err?.response?.data || err?.message || fallbackMsg;
  console.error('DeepSeek error:', status, detail);
  if (status === 401) return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Bad/expired DeepSeek API key' });
  if (status === 402) return res.status(402).json({ errorCode: 'INSUFFICIENT_BALANCE', message: 'DeepSeek balance is empty' });
  res.status(status).json({ error: typeof detail === 'string' ? detail : JSON.stringify(detail) });
}
function handleStreamError(res, err, label) {
  const status = err?.status || err?.response?.status || 500;
  const detail = err?.response?.data || err?.message || label;
  console.error(`${label}:`, status, detail);
  try {
    res.write(`data: ${JSON.stringify({ error: typeof detail === 'string' ? detail : JSON.stringify(detail) })}\n\n`);
    res.write('data: [DONE]\n\n');
  } catch {}
  res.end();
}
