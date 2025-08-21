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

  // never auto-timeout the socket
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

// Stream one completion; write tokens; return finishReason
async function streamOneCompletion({ model, messages, temperature = 0.2, max_tokens = 4096, write, sse }) {

  const stream = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
    max_tokens, // explicit high cap
    // no "stop" here to avoid cutting code
  });

  let finishReason = null;
  for await (const chunk of stream) {
  if (sse?.isClosed && sse.isClosed()) {
    // client gone -> stop consuming stream
    stream.controller?.abort?.();
    break;
  }
  const choice = chunk?.choices?.[0];
  const token = choice?.delta?.content;
  if (token) write(token);
  if (choice?.finish_reason) finishReason = choice.finish_reason; // e.g., "length", "stop"
}

// if client closed during stream, signal caller to bail out
if (sse?.isClosed && sse.isClosed()) {
  return finishReason || 'client_closed';
}
return finishReason;

}

// ---------- health ----------
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- non-streaming ----------
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, history = [] } = req.body || {};
    if (!prompt?.trim()) return res.status(400).json({ error: 'Missing prompt' });

    const trimmed = trimHistory(history, 6, 16000);
    const messages = [
      { role: 'system', content: 'You are a concise, helpful coding assistant.' },
      ...trimmed,
      { role: 'user', content: prompt.trim() },
    ];

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: 4096, // keep explicit
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

// ---------- streaming via POST (fetch clients) ----------
app.post('/api/stream', async (req, res) => {
  try {
    const { prompt, history = [], model } = req.body || {};
    if (!prompt?.trim()) return res.status(400).end();

    const sse = initSSE(req, res);
    res.write(': connected\n\n');
    res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);

    const trimmed = trimHistory(history, 6, 16000);
    const baseMessages = [
      { role: 'system', content: 'You are a concise, helpful coding assistant.' },
      ...trimmed,
      { role: 'user', content: prompt.trim() },
    ];

    const write = (text) => { if (!sse.isClosed()) res.write(`data: ${JSON.stringify({ token: text })}\n\n`); };

    let loops = 0;
    const MAX_LOOPS = 5; // up to 5 auto-continues
    let messages = baseMessages;
    const useModel = model || 'deepseek-chat';

    while (!sse.isClosed() && loops++ < MAX_LOOPS) {
      const finish = await streamOneCompletion({
        model: useModel,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        write,
        sse,   // pass sse here
      });

      if (finish === 'length') {
        // auto-continue
        messages = [
          ...messages,
          { role: 'assistant', content: '(continuing...)' },
          { role: 'user', content: 'Continue exactly from where you stopped. Do not repeat earlier lines; only new code.' },
        ];
        continue;
      }
      break; // finished naturally or stopped
    }

    if (!sse.isClosed()) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
    sse.stop();
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

// ---------- streaming via GET for EventSource ----------
app.get('/api/stream-es', async (req, res) => {
  try {
    const prompt = `${req.query.prompt || ''}`;
    const histParam = `${req.query.history || '[]'}`; // URL-encoded JSON from client
    if (!prompt.trim()) return res.status(400).end();

    let history = [];
    try { history = JSON.parse(decodeURIComponent(histParam)); } catch {
      try { history = JSON.parse(histParam); } catch {}
    }

    const sse = initSSE(req, res);
    res.write(': connected\n\n');
    res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);

    const trimmed = trimHistory(history, 6, 16000);
    const baseMessages = [
      { role: 'system', content: 'You are a concise, helpful coding assistant.' },
      ...trimmed,
      { role: 'user', content: prompt.trim() },
    ];

    const write = (text) => { if (!sse.isClosed()) res.write(`data: ${JSON.stringify({ token: text })}\n\n`); };

    let loops = 0;
    const MAX_LOOPS = 5;
    let messages = baseMessages;
    const useModel = 'deepseek-chat';

    console.log('[stream-GET] prompt len:', prompt.length, 'hist:', history.length);

    while (!sse.isClosed() && loops++ < MAX_LOOPS) {
const finish = await streamOneCompletion({
  model: useModel,
  messages,
  temperature: 0.2,
  max_tokens: 4096,
  write,
  sse, // <-- pass it here
});


      if (finish === 'length') {
        // auto-continue
        messages = [
          ...messages,
          { role: 'assistant', content: '(continuing...)' },
          { role: 'user', content: 'Continue exactly from where you stopped. Do not repeat earlier lines; only new code.' },
        ];
        continue;
      }
      break;
    }

    if (!sse.isClosed()) {
      res.write('data: [DONE]\n\n'); // send DONE once, at the very end
      res.end();
    }
    sse.stop();
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
