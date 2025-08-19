// backend/index.js (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();

// CORS + JSON (tighten in prod)
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// DeepSeek (OpenAI-compatible)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// --- health ---
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- non-streaming ---
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, history = [] } = req.body || {};
    if (!prompt?.trim()) return res.status(400).json({ error: 'Missing prompt' });

    const messages = [
      { role: 'system', content: 'You are a concise, helpful coding assistant.' },
      ...history.slice(-12).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt.trim() },
    ];

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: 800,
    });
    const reply = completion.choices?.[0]?.message?.content?.trim() || '';
    res.json({ reply });
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const detail = err?.response?.data || err?.message || 'DeepSeek request failed';
    console.error('DeepSeek error:', status, detail);
    if (status === 401) return res.status(401).json({ errorCode: 'UNAUTHORIZED', message: 'Bad/expired DeepSeek API key' });
    if (status === 402) return res.status(402).json({ errorCode: 'INSUFFICIENT_BALANCE', message: 'DeepSeek balance is empty' });
    res.status(status).json({ error: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  }
});

// --- streaming via POST (keep for fetch-based clients) ---
app.post('/api/stream', async (req, res) => {
  try {
    const { prompt, history = [], model } = req.body || {};
    if (!prompt?.trim()) return res.status(400).end();

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();

    const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);
    let clientClosed = false;
    req.on('close', () => { clientClosed = true; clearInterval(hb); });

    res.write(': connected\n\n');
    res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);

    const messages = [
      { role: 'system', content: 'You are a concise, helpful coding assistant.' },
      ...history.slice(-12).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt.trim() },
    ];

    console.log('[stream-POST] prompt len:', prompt.length, 'hist:', history.length);

    const stream = await openai.chat.completions.create({
      model: model || 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: 800,
      stream: true,
    });

    for await (const chunk of stream) {
      if (clientClosed) break;
      const token = chunk?.choices?.[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    if (!clientClosed) { res.write('data: [DONE]\n\n'); res.end(); }
    clearInterval(hb);
    console.log('[stream-POST] done');
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const detail = err?.response?.data || err?.message || 'DeepSeek stream failed';
    console.error('DeepSeek stream error (POST):', status, detail);
    try {
      res.write(`data: ${JSON.stringify({ error: typeof detail === 'string' ? detail : JSON.stringify(detail) })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch {}
    res.end();
  }
});

// --- streaming via GET for EventSource (no fetch/body gotchas) ---
app.get('/api/stream-es', async (req, res) => {
  try {
    const prompt = `${req.query.prompt || ''}`;
    const histParam = `${req.query.history || '[]'}`; // URL-encoded JSON
    if (!prompt.trim()) return res.status(400).end();

    // decode history
    let history = [];
    try { history = JSON.parse(decodeURIComponent(histParam)); } catch {}

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();

    const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);
    let clientClosed = false;
    req.on('close', () => { clientClosed = true; clearInterval(hb); });

    res.write(': connected\n\n');
    res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);

    const messages = [
      { role: 'system', content: 'You are a concise, helpful coding assistant.' },
      ...history.slice(-12).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt.trim() },
    ];

    console.log('[stream-GET] prompt len:', prompt.length, 'hist:', history.length);

    const stream = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: 800,
      stream: true,
    });

    for await (const chunk of stream) {
      if (clientClosed) break;
      const token = chunk?.choices?.[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    if (!clientClosed) { res.write('data: [DONE]\n\n'); res.end(); }
    clearInterval(hb);
    console.log('[stream-GET] done');
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const detail = err?.response?.data || err?.message || 'DeepSeek stream failed';
    console.error('DeepSeek stream error (GET):', status, detail);
    try {
      res.write(`data: ${JSON.stringify({ error: typeof detail === 'string' ? detail : JSON.stringify(detail) })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch {}
    res.end();
  }
});

// --- local SSE sanity test (no DeepSeek) ---
app.get('/api/stream-test', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();

  let i = 0;
  const text = 'hello guddu';
  const t = setInterval(() => {
    if (i >= text.length) {
      res.write('data: [DONE]\n\n');
      res.end();
      clearInterval(t);
      return;
    }
    res.write(`data: ${JSON.stringify({ token: text[i++] })}\n\n`);
  }, 150);
  req.on('close', () => clearInterval(t));
});

// --- boot ---
const PORT = Number(process.env.PORT) || 4000;
const HOST = '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`API on http://${HOST}:${PORT}`);
});
server.on('error', (err) => console.error('Listen error:', err));

process.on('unhandledRejection', (r) => console.error('UNHANDLED REJECTION:', r));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION:', e));
