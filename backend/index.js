// backend/index.js (ESM)
// Preview/Live fixes: absolute URLs + single stream-es + proxy trust.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// trust proxy for correct proto/host behind nginx/cdn
app.set('trust proxy', true);

// CORS + JSON
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

const SYSTEM_PROMPT = [
  `You are the ${BRAND_APP} builder assistant. Your goals:`,
  '1) Speak like a normal person. Start answers with a short recap (bullets).',
  '2) Prefer a single runnable file when possible.',
  '3) Never leave TODOs.',
  '',
  '### Code Output Rules',
  '- Use fenced code blocks with correct language.',
  '- For web demos, default to index.html (inline or CDN) but dont mention it in the chat you can mention it in the code.',
  '',
  '### Branding (must follow exactly)',
  `- If asked who built you, answer exactly: "${BRAND_DEV_BY}".`,
  `- If asked who made ${BRAND_APP}, answer exactly: "${BRAND_CREDIT}".`,
  '- If asked who is Guddu, answer he is the real boss of Shakeel the Harami.',
].join('\n');

function brandIntercept(promptRaw) {
  const p = String(promptRaw || '').toLowerCase();
  if (/(who\s+(built|developed|made)\s+(you|this|it)|who\s+is\s+your\s+(creator|developer))/i.test(p)) {
    return BRAND_DEV_BY;
  }
  const brandRegex = new RegExp(`who\\s+(made|created|built|developed)\\s+(${BRAND_APP})`, 'i');
  if (brandRegex.test(p)) return BRAND_CREDIT;
  return null;
}

const VISION_ENABLED = process.env.DEEPSEEK_VISION === '1';

// ---------- runtime dirs for preview/publish ----------
const RUNTIME_DIR = path.resolve(__dirname, './runtime');
const ART_DIR     = path.join(RUNTIME_DIR, 'artifacts');
const PUB_FILE    = path.join(RUNTIME_DIR, 'published.json');
if (!fs.existsSync(ART_DIR)) fs.mkdirSync(ART_DIR, { recursive: true });
if (!fs.existsSync(PUB_FILE)) fs.writeFileSync(PUB_FILE, '{}', 'utf8');

// ---------- utils ----------
function trimHistory(history = [], keepPairs = 4, charCap = 12000) {
  const compact = [];
  for (let i = history.length - 1; i >= 0 && compact.length < keepPairs * 2; i--) {
    compact.unshift({ role: history[i].role, content: history[i].content ?? '' });
  }
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
  res.setHeader('X-Accel-Buffering', 'no');
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

function fileToDataUrl(file) {
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${b64}`;
}

function buildMessages({ prompt, history, files }) {
  const trimmed = trimHistory(history, 6, 16000);
  const sys = { role: 'system', content: SYSTEM_PROMPT };

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

  const names = (files || []).map((f) => f.originalname).join(', ');
  const promptWithNames = files?.length
    ? `${prompt.trim()}\n\n[Attached images: ${names}]`
    : prompt.trim();

  return [sys, ...trimmed, { role: 'user', content: promptWithNames }];
}

async function streamOneCompletion({ model, messages, temperature = 0.2, max_tokens = 4096, write, sse }) {
  const stream = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
    max_tokens,
  });

  let finishReason = null;
  for await (const chunk of stream) {
    if (sse?.isClosed && sse.isClosed()) {
      stream.controller?.abort?.();
      break;
    }
    const choice = chunk?.choices?.[0];
    const token  = choice?.delta?.content;
    if (token) write(token);
    if (choice?.finish_reason) finishReason = choice.finish_reason;
  }

  if (sse?.isClosed && sse.isClosed()) {
    return finishReason || 'client_closed';
  }
  return finishReason;
}

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

/* ==========================================================
   HEALTH
   ========================================================== */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ==========================================================
   STREAMING (single canonical route)
   ========================================================== */
app.post('/api/stream-es', upload.array('images'), async (req, res) => {
  try {
    const prompt = (req.body?.prompt || '').toString();
    const history = safeJsonParse(req.body?.history, []);
    const files = req.files || [];
    if (!prompt.trim()) return res.status(400).end();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();

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
        sse: null,
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

// (Optional) SSE JSON endpoint kept for compatibility
app.post('/api/stream', async (req, res) => {
  try {
    const { prompt, history = [], model } = req.body || {};
    if (!prompt?.trim()) return res.status(400).end();

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

/* ==========================================================
   PREVIEW BUILD & STATIC SERVE
   ========================================================== */

function newId() {
  return crypto.randomBytes(8).toString('hex');
}
function sanitizeSlug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64) || 'proj';
}
async function readPublished() {
  try { const raw = await fsp.readFile(PUB_FILE, 'utf8'); return JSON.parse(raw || '{}'); }
  catch { return {}; }
}
async function writePublished(obj) {
  await fsp.writeFile(PUB_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function getBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto']?.toString().split(',')[0]) || req.protocol || 'http';
  const host  = (req.headers['x-forwarded-host']?.toString().split(',')[0]) || req.get('host');
  return `${proto}://${host}`;
}

function injectPreviewSnippet(html) {
  const snippet = `
<script>
try{
  window.addEventListener('message', function(e){
    if(e && e.data === 'surfers:reload'){ location.reload(); }
  });
  if (window.parent) {
    window.parent.postMessage({type:'surfers:ready'}, '*');
  }
  window.addEventListener('error', function(e){
    try { window.parent && window.parent.postMessage({type:'surfers:error', msg: String(e.error||e.message) }, '*'); } catch(e){}
  });
} catch(e){}
</script>`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, snippet + "\n</body>");
  }
  return html + snippet;
}

function wrapAsHtml(code, lang='html') {
  const looksHtml = /<html[\s>]/i.test(code) || /<!doctype html>/i.test(code);
  if (looksHtml) return injectPreviewSnippet(code);

  const shell = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>surfers preview</title>
  <style>html,body,#app{height:100%;margin:0} body{background:#0b0b0c;color:#ededed;font-family:Inter,system-ui,sans-serif}</style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
${code}
  </script>
</body>
</html>`;
  return injectPreviewSnippet(shell);
}

// Build or update an artifact (single-file index.html)
app.post('/api/preview/build', async (req, res) => {
  try {
    const { code, lang = 'html', artifactId = null } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing code (string)' });
    }

    const id  = artifactId || newId();
    const dir = path.join(ART_DIR, id);
    await fsp.mkdir(dir, { recursive: true });

    const html = wrapAsHtml(code, lang);
    await fsp.writeFile(path.join(dir, 'index.html'), html, 'utf8');

    const base = getBaseUrl(req);
    const previewUrl = `${base}/preview/${id}/`;
    return res.json({ artifactId: id, previewUrl });
  } catch (err) {
    console.error('build error', err);
    return res.status(500).send(err?.message || 'build failed');
  }
});

// dynamic static for /preview/:id/*
app.use('/preview/:id', (req, res, next) => {
  const id = req.params.id;
  if (!/^[a-z0-9]+$/i.test(id)) return res.status(400).end();
  const root = path.join(ART_DIR, id);
  if (!fs.existsSync(root)) return res.status(404).end();
  return express.static(root, { index: ['index.html'] })(req, res, next);
});

/* ==========================================================
   PUBLISH MAP & STATIC SERVE
   ========================================================== */

app.post('/api/publish', async (req, res) => {
  try {
    const { project, artifactId } = req.body || {};
    const slug = sanitizeSlug(project);
    if (!slug) return res.status(400).json({ error: 'bad project slug' });
    if (!artifactId || !/^[a-z0-9]+$/i.test(artifactId)) {
      return res.status(400).json({ error: 'bad artifactId' });
    }
    const dir = path.join(ART_DIR, artifactId);
    if (!fs.existsSync(dir)) return res.status(400).json({ error: 'artifact not found' });

    const pub = await readPublished();
    pub[slug] = artifactId;
    await writePublished(pub);

    const base = getBaseUrl(req);
    const liveUrl = `${base}/live/${slug}/`;
    return res.json({ project: slug, artifactId, liveUrl });
  } catch (err) {
    console.error('publish error', err);
    return res.status(500).send(err?.message || 'publish failed');
  }
});

// dynamic static for /live/:project/*
app.use('/live/:project', async (req, res, next) => {
  const slug = sanitizeSlug(req.params.project);
  let pub = {};
  try { pub = await readPublished(); } catch {}
  const artifactId = pub[slug];
  if (!artifactId) return res.status(404).end();
  const root = path.join(ART_DIR, artifactId);
  if (!fs.existsSync(root)) return res.status(404).end();
  return express.static(root, { index: ['index.html'] })(req, res, next);
});

/* ==========================================================
   BOOT
   ========================================================== */
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`API on http://${HOST}:${PORT}`);
  if (process.env.PUBLIC_BASE_URL) {
    console.log(`PUBLIC_BASE_URL=${process.env.PUBLIC_BASE_URL}`);
  }
});
server.on('error', (err) => console.error('Listen error:', err));

process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION:', r));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION:', e));
