// backend/index.js
import express from "express";
import cors from "cors";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "surfers-api" });
});

// Placeholder: generate code from a prompt (stub for now)
app.post("/api/generate", async (req, res) => {
  const { prompt = "" } = req.body || {};
  // TODO: call your model/service here
  const code = `// generated code for: ${prompt}\nconsole.log('surfers!');`;
  res.json({ code });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Surfers API running on http://localhost:${PORT}`);
});
