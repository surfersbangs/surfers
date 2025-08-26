// App.jsx
import { useState, useRef, useEffect } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark-dimmed.css";

import React from "react";

/* =========================
   Error Boundary
   ========================= */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: "" };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, msg: String(err) };
  }
  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] App crashed:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: "#eee", background: "#0B0B0C", minHeight: "100vh" }}>
          <div
            style={{
              maxWidth: 720,
              margin: "40px auto",
              background: "#121214",
              border: "1px solid #2A2A2A",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>something broke. 😵‍💫</h2>
            <p style={{ opacity: 0.8 }}>
              the app hit a runtime error but stayed up thanks to the error boundary.
            </p>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#0f0f10",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #2A2A2A",
              }}
            >
              {this.state.msg}
            </pre>
            <p style={{ opacity: 0.7, fontSize: 12 }}>
              check the console for stack trace (DevTools ▶ Console).
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* =========================
   Small UI helpers
   ========================= */
const Container = ({ children, className = "" }) => (
  <div className={`mx-auto ${className}`} style={{ width: "min(1120px, 90vw)" }}>
    {children}
  </div>
);

const LogoSmall = ({ className = "h-5 w-5" }) => (
  <img src="/logo.png" alt="surfers logo" className={className} />
);

const LogoLarge = ({ className = "h-24 w-24" }) => <LogoSmall className={className} />;

const ProfileIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#E5E7EB">
    <circle cx="12" cy="8" r="3" strokeWidth="1.5" />
    <path d="M5 20c1.5-3.5 5-5 7-5s5.5 1.5 7 5" strokeWidth="1.5" />
  </svg>
);

const BackArrow = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#E5E7EB">
    <path d="M15 6l-6 6 6 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ImageIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="#2B2B2B" />
    <circle cx="7" cy="8" r="1.5" fill="#2B2B2B" />
    <path d="M4.5 14.5l4-4 2.5 2.5 2-2 2.5 3.5" stroke="#2B2B2B" strokeWidth="1.2" />
  </svg>
);
const FigmaIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 12 18" className={className} aria-hidden="true">
    <path d="M6 9a3 3 0 100-6H3v6h3z" fill="#1ABCFE" />
    <path d="M3 18a3 3 0 100-6 3 3 0 000 6z" fill="#0ACF83" />
    <path d="M3 6h3a3 3 0 100-6H3v6z" fill="#FF7262" />
    <path d="M3 12h3V6H3a3 3 0 100 6z" fill="#F24E1E" />
    <path d="M9 12a3 3 0 100-6 3 3 0 000 6z" fill="#A259FF" />
  </svg>
);
const Spinner = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g fill="none" stroke="#C8CCD2" strokeWidth="2">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.5s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  </svg>
);

/* =========================
   Markdown + Code highlight
   ========================= */
function CodeBlock({ inline, className, children, ...props }) {
  const codeRef = useRef(null);
  const raw = Array.isArray(children) ? children.join("") : children ?? "";
  const lang = (className || "").replace("language-", "").trim();

  // detect single-line (no newline)
  const isSingleLine = !raw.includes("\n");

  useEffect(() => {
    if (inline || isSingleLine) return; // skip highlight for tiny inline snippets
    let mounted = true;
    import("highlight.js")
      .then((mod) => {
        if (!mounted || !codeRef.current) return;
        try {
          const hljs = mod.default || mod;
          if (lang && hljs.getLanguage && hljs.getLanguage(lang)) {
            const { value } = hljs.highlight(raw, { language: lang });
            codeRef.current.innerHTML = value;
            codeRef.current.classList.add("hljs");
          } else if (hljs.highlightAuto) {
            const { value } = hljs.highlightAuto(raw);
            codeRef.current.innerHTML = value;
            codeRef.current.classList.add("hljs");
          } else {
            codeRef.current.textContent = raw;
          }
        } catch {
          if (codeRef.current) codeRef.current.textContent = raw;
        }
      })
      .catch(() => {
        if (codeRef.current) codeRef.current.textContent = raw;
      });
    return () => {
      mounted = false;
    };
  }, [raw, lang, inline, isSingleLine]);

  // force single-line snippets into inline style
  if (inline || isSingleLine) {
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-[#151517] border border-[#2A2A2A] text-sm"
        {...props}
      >
        {raw}
      </code>
    );
  }

  // multi-line → normal block
  return (
    <pre className="mb-3 rounded-[12px] bg-[#0f0f10] border border-[#2A2A2A] overflow-x-auto">
      <code
        ref={codeRef}
        style={{ background: "transparent" }}
        className={`block p-3 ${className || ""}`}
      />
    </pre>
  );
}


function Markdown({ children }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      
      components={{
        a: ({ node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[#4b9fff] hover:opacity-90"
          />
        ),
        p: ({ node, ...props }) => <p {...props} className="mb-3" />,
        ul: ({ node, ...props }) => (
          <ul {...props} className="list-disc pl-5 mb-3 space-y-1" />
        ),
        ol: ({ node, ...props }) => (
          <ol {...props} className="list-decimal pl-5 mb-3 space-y-1" />
        ),
        li: ({ node, ...props }) => <li {...props} className="leading-6" />,
        h1: ({ node, ...props }) => (
          <h1 {...props} className="text-xl font-semibold mb-2 mt-3" />
        ),
        h2: ({ node, ...props }) => (
          <h2 {...props} className="text-lg font-semibold mb-2 mt-3" />
        ),
        h3: ({ node, ...props }) => (
          <h3 {...props} className="text-base font-semibold mb-2 mt-3" />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote
            {...props}
            className="border-l-2 border-[#2A2A2A] pl-3 italic text-[#c7cbd2] mb-3"
          />
        ),
        code: CodeBlock,
      }}
    >
      {text}
      
    </ReactMarkdown>
  );
}

/* =========================
   Stream constants
   ========================= */
const STREAM_INACTIVITY_MS = 60000;
const STREAM_MAX_DURATION_MS = 0;
const VERSION_TAG = "app modal rev - 2025-08-23";

/* =========================
   Code extraction helpers
   ========================= */
const FENCE_GLOBAL_RE = /```(\w+)?\n([\s\S]*?)```/g;
const INLINE_LANG_RE = /^\s*(html?|css|js|javascript|typescript)\s*:?\s*$/i;

// --- NEW: robust file extraction for CodeModal tabs ---
const ANY_FENCE_RE = /```([^\n]*)\n([\s\S]*?)```/g;

const LANG_MAP = {
  "c++": "cpp",
  cpp: "cpp",
  "c#": "csharp",
  csharp: "csharp",
  "objective-c": "objectivec",
  "obj-c": "objectivec",
  html: "html",
  htm: "html",
  css: "css",
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  tsx: "tsx",
  jsx: "jsx",
  py: "python",
  python: "python",
  java: "java",
  cs: "csharp",
  go: "go",
  rs: "rust",
  rust: "rust",
  php: "php",
  rb: "ruby",
  ruby: "ruby",
  swift: "swift",
  kt: "kotlin",
  kotlin: "kotlin",
  sh: "bash",
  bash: "bash",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  xml: "xml",
  md: "markdown",
  markdown: "markdown",
  sql: "sql",
  lua: "lua",
  r: "r",
  dart: "dart",
  scala: "scala",
  zig: "zig",
  txt: "plaintext",
  plaintext: "plaintext",
};

const EXT_FROM_LANG = {
  html: "html",
  css: "css",
  javascript: "js",
  typescript: "ts",
  tsx: "tsx",
  jsx: "jsx",
  python: "py",
  java: "java",
  csharp: "cs",
  cpp: "cpp",
  c: "c",
  go: "go",
  rust: "rs",
  php: "php",
  ruby: "rb",
  swift: "swift",
  kotlin: "kt",
  bash: "sh",
  yaml: "yml",
  json: "json",
  xml: "xml",
  markdown: "md",
  sql: "sql",
  lua: "lua",
  r: "r",
  dart: "dart",
  scala: "scala",
  zig: "zig",
  plaintext: "txt",
};

function normalizeLang(s) {
  if (!s) return "";
  const key = s.trim().toLowerCase();
  return LANG_MAP[key] || key;
}

function extFromFilename(fname) {
  const base = (fname || "").trim().split("/").pop() || "";
  if (/^\.gitignore$/i.test(base)) return "plaintext";
  if (/^makefile$/i.test(base)) return "plaintext";
  if (/^dockerfile$/i.test(base)) return "dockerfile";
  const m = base.match(/\.([A-Za-z0-9]+)$/);
  const ext = m ? m[1].toLowerCase() : "";
  // map a few common ones to lang names
  const extLangMap = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "scss",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    cs: "csharp",
    cpp: "cpp",
    cxx: "cpp",
    cc: "cpp",
    c: "c",
    php: "php",
    kt: "kotlin",
    swift: "swift",
    sh: "bash",
    bash: "bash",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    lua: "lua",
    r: "r",
    dart: "dart",
    scala: "scala",
    zig: "zig",
    txt: "plaintext",
  };
  return extLangMap[ext] || "plaintext";
}

function defaultNameForLang(lang, idx = 0) {
  const l = normalizeLang(lang) || "plaintext";
  if (l === "html") return "index.html";
  const ext = EXT_FROM_LANG[l] || "txt";
  return idx ? `snippet-${idx + 1}.${ext}` : `main.${ext}`;
}

function isLikelyFilenameToken(s) {
  const t = (s || "").trim().replace(/:$/, "");
  if (!t || /\s/.test(t)) return false;
  if (t.startsWith(".")) return true; // .gitignore, .env
  if (t.includes(".")) return true; // style.css, main.cpp
  const specials = ["Makefile", "Dockerfile", "CMakeLists.txt", "LICENSE", "README", "README.md"];
  return specials.includes(t);
}

function extractFilesFromText(text) {
  const files = [];
  if (!text) return files;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const startMatch = lines[i].match(/^\s*```(.*)$/);
    if (!startMatch) continue;

    const info = (startMatch[1] || "").trim(); // could be lang or filename
    const startIdx = i;
    const codeLines = [];
    i++;
    while (i < lines.length && !/^\s*```/.test(lines[i])) {
      codeLines.push(lines[i]);
      i++;
    }
    // closing fence consumed by loop (if present)

    let filename = null;
    let lang = "";

    // If the info string itself looks like a filename, use it
    if (isLikelyFilenameToken(info)) {
      filename = info.replace(/:$/, "");
      lang = extFromFilename(filename);
    } else {
      lang = normalizeLang(info);
    }

    // If no filename yet, look a few lines above for a lone filename token (incl. bullets/headings)
    if (!filename) {
      for (let k = startIdx - 1, tries = 0; k >= 0 && tries < 4; k--, tries++) {
        let probe = lines[k].trim();
        if (!probe) continue;
        probe = probe.replace(/^[-*]\s+/, ""); // bullet lists
        probe = probe.replace(/^#{1,6}\s+/, ""); // markdown headings
        if (isLikelyFilenameToken(probe)) {
          filename = probe.replace(/:$/, "");
          if (!lang) lang = extFromFilename(filename);
          break;
        }
      }
    }

    // Fallback naming
    if (!lang) lang = "plaintext";
    if (!filename) filename = defaultNameForLang(lang, files.length);

    files.push({
      name: filename,
      lang,
      code: codeLines.join("\n"),
    });
  }

  // If nothing was fenced, fall back to the merged parser to at least show something
  if (files.length === 0) {
    const parsed = parseGeneratedCode(text);
    files.push({
      name: defaultNameForLang(parsed.lang || "plaintext"),
      lang: parsed.lang || "plaintext",
      code: parsed.code || "",
    });
  }

  return files;
}

function collectFencedBlocks(text) {
  const out = [];
  let m;
  while ((m = FENCE_GLOBAL_RE.exec(text)) !== null) {
    const lang = (m[1] || "").toLowerCase();
    out.push({ lang, code: m[2] || "" });
  }
  return out;
}

function findHtmlFragment(text) {
  const start = text.search(/<!DOCTYPE\s+html>|<html[\s>]/i);
  if (start === -1) return null;
  const rest = text.slice(start);
  const endRel = rest.search(/<\/html>/i);
  const end = endRel === -1 ? text.length : start + endRel + "</html>".length;
  const frag = text.slice(start, end).trim();
  return frag || null;
}

function splitByHeadings(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (INLINE_LANG_RE.test(line)) {
      current = line.trim().replace(/:$/, "").toLowerCase();
      if (current === "javascript") current = "js";
      if (current === "htm") current = "html";
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  const out = {};
  for (const k of Object.keys(sections)) {
    const v = sections[k].join("\n").trim();
    if (v) out[k] = v;
  }
  return out;
}

function assembleHtml({ html, css, js }) {
  if (!html) {
    const headBits = [];
    if (css) headBits.push(`<style>\n${css}\n</style>`);
    const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${
      headBits.length ? "\n" + headBits.join("\n") : ""
    }`;
    const bodyScript = js ? `\n<script>\n${js}\n</script>` : "";
    return `<!DOCTYPE html>
<html><head>${head}</head><body>${bodyScript}</body></html>`;
  }
  let result = html;
  if (css) {
    if (/<\/head>/i.test(result)) {
      result = result.replace(/<\/head>/i, `<style>\n${css}\n</style>\n</head>`);
    } else {
      result = result.replace(
        /<html[^>]*>/i,
        `$&\n<head><style>\n${css}\n</style></head>`
      );
    }
  }
  if (js) {
    if (/<\/body>/i.test(result)) {
      result = result.replace(/<\/body>/i, `<script>\n${js}\n</script>\n</body>`);
    } else {
      result += `\n<script>\n${js}\n</script>`;
    }
  }
  return result;
}

function parseGeneratedCode(fullText) {
  const text = fullText || "";

  const fenced = collectFencedBlocks(text);
  const fencedHtml = fenced.filter((b) => b.lang === "html" || b.lang === "htm");
  const fencedCss = fenced.filter((b) => b.lang === "css");
  const fencedJs = fenced.filter(
    (b) => b.lang === "js" || b.lang === "javascript" || b.lang === "ts" || b.lang === "typescript"
  );

  const htmlFrag = findHtmlFragment(text);
  if (htmlFrag) {
    const css = fencedCss.map((b) => b.code).join("\n\n").trim();
    const js = fencedJs.map((b) => b.code).join("\n\n").trim();
    const merged = assembleHtml({ html: htmlFrag, css: css || null, js: js || null });
    return { lang: "html", code: merged };
  }

  const sections = splitByHeadings(text);
  if (sections.html || sections.css || sections.js) {
    const merged = assembleHtml({
      html: sections.html || null,
      css: sections.css || null,
      js: sections.js || sections.javascript || sections.ts || sections.typescript || null,
    });
    return { lang: "html", code: merged };
  }

  if (fenced.length) {
    const htmlLongest = fencedHtml.sort((a, b) => b.code.length - a.code.length)[0]?.code || null;
    const cssMerged = fencedCss.map((b) => b.code).join("\n\n").trim() || null;
    const jsMerged = fencedJs.map((b) => b.code).join("\n\n").trim() || null;
    const merged = assembleHtml({ html: htmlLongest, css: cssMerged, js: jsMerged });
    return { lang: "html", code: merged };
  }

  const maybeTagIdx = text.search(
    /<(!DOCTYPE|html|head|body|canvas|div|section|main|script|style)\b/i
  );
  if (maybeTagIdx !== -1) {
    const tail = text.slice(maybeTagIdx).trim();
    return { lang: "html", code: tail };
  }

  const js = text.trim();
  const html = assembleHtml({ js });
  return { lang: "html", code: html };
}

/* =========================
   Stream ingestor (raw/SSE/ndjson)
   ========================= */
function makeStreamIngestor(onText, onDone) {
  let mode = "unknown"; // raw | sse | ndjson
  let buf = "";

  // --- FIX: strip stray [DONE] tokens in all modes ---
  const stripDone = (s = "") => s.replace(/^\s*(?:data:\s*)?\[DONE\]\s*$/gm, "");

  function handleRaw(s) {
    const c = stripDone(s);
    if (c) onText(c);
  }
  function handleSSE(s) {
    buf += s;
    const parts = buf.split(/\n\n/);
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const lines = part.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*data:\s?(.*)$/);
        if (!m) continue;
        let payload = m[1];
        if (payload === "[DONE]") {
          onDone?.();
          return;
        }
        payload = stripDone(payload);
        if (!payload) continue;
        if (payload.trim().startsWith("{")) {
          try {
            const j = JSON.parse(payload);
            const t =
              j?.delta ??
              j?.text ??
              j?.content ??
              j?.choices?.[0]?.delta?.content ??
              "";
            if (t) onText(t);
          } catch {
            onText(payload);
          }
        } else {
          onText(payload);
        }
      }
    }
  }
  function handleNDJSON(s) {
    buf += s;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (let line of lines) {
      line = stripDone(line.trim());
      if (!line) continue;
      try {
        const j = JSON.parse(line);
        const out =
          j?.delta ?? j?.text ?? j?.content ?? j?.choices?.[0]?.delta?.content ?? "";
        const c = stripDone(out);
        if (c) onText(c);
      } catch {
        onText(line);
      }
    }
  }

  return {
    feed(chunk) {
      if (mode === "unknown") {
        const probe = buf + chunk;
        if (/^\s*data:/m.test(probe)) mode = "sse";
        else if (probe.trim().startsWith("{") || probe.includes("\n{")) mode = "ndjson";
        else mode = "raw";
      } else if (mode === "raw" && /^\s*data:/m.test(chunk)) {
        // upgrade if the stream switches to SSE later
        mode = "sse";
      }
      if (mode === "sse") return handleSSE(chunk);
      if (mode === "ndjson") return handleNDJSON(chunk);
      return handleRaw(chunk);
    },
    end() {
      if (mode === "ndjson" && buf.trim()) {
        const tail = stripDone(buf.trim());
        if (tail) {
          try {
            const j = JSON.parse(tail);
            const out =
              j?.delta ?? j?.text ?? j?.content ?? j?.choices?.[0]?.delta?.content ?? "";
            if (out) onText(stripDone(out));
          } catch {
            onText(tail);
          }
        }
      } else if (mode === "sse") {
        handleSSE("\n\n");
      }
      onDone?.();
    },
  };
}

/* =========================
   MODALS — brand new
   ========================= */

// Generic overlay
const Overlay = ({ children, onClose }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70">
    <button
      aria-label="close overlay"
      onClick={onClose}
      className="fixed top-4 right-4 h-9 w-9 rounded-full bg-[#1a1a1b] text-[#e5e7eb] hover:bg-[#232325]"
    >
      ×
    </button>
    {children}
  </div>
);

// VIEW modal (window-style)
const ViewModal = ({ open, url, onClose }) => {
  if (!open) return null;
  const label = (() => {
    try {
      const u = new URL(url);
      return `${u.host}${u.pathname}`;
    } catch {
      return url || "";
    }
  })();
  return (
    <Overlay onClose={onClose}>
      <div className="w-[min(1050px,95vw)] h-[min(86vh,820px)] rounded-2xl overflow-hidden shadow-2xl border border-[#2A2A2A] bg-[#1b1b1c]">
        <div className="h-10 flex items-center justify-center bg-[#2a2a2b] text-[#d2d5db] text-sm relative">
          <div className="absolute left-3 top-0 h-10 flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="inline-block h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="inline-block h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="opacity-80">{label || "preview"}</span>
        </div>
        <div className="w-full h-[calc(100%-40px)] bg-[#0f0f10]">
          {url ? (
            <iframe
              key={url}
              src={url}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              allow="accelerometer; camera; microphone; clipboard-read; clipboard-write; geolocation; gyroscope; payment; fullscreen"
              referrerPolicy="no-referrer"
              title="preview"
            />
          ) : (
            <div className="p-6 text-[#c7cbd2]">building preview…</div>
          )}
        </div>
      </div>
    </Overlay>
  );
};

// CODE modal (editor-like) — TABS NOW DYNAMIC FROM OUTPUT
const CodeModal = ({ open, files = [], lang, code, onClose }) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) setActive(0);
  }, [open]);

  if (!open) return null;

  const hasFiles = Array.isArray(files) && files.length > 0;
  const fallbackName = defaultNameForLang(normalizeLang(lang || "plaintext"));
  const tabFiles = hasFiles ? files : [{ name: fallbackName, lang: normalizeLang(lang || "plaintext"), code: code || "" }];
  const shown = tabFiles[Math.min(active, tabFiles.length - 1)];

  return (
    <Overlay onClose={onClose}>
      <div className="w-[min(980px,94vw)] h-[min(82vh,760px)] rounded-2xl overflow-hidden shadow-2xl border border-[#2A2A2A] bg-[#111214]">
        <div className="h-10 bg-[#1b1b1c] border-b border-[#2A2A2A] flex items-center">
          <div className="px-3 text-xs text-[#9aa0a6]">download as ZIP</div>
          <div className="ml-2 flex items-center gap-2 text-sm overflow-x-auto">
            {tabFiles.map((f, idx) => (
              <button
                key={`${f.name}-${idx}`}
                type="button"
                onClick={() => setActive(idx)}
                className={
                  idx === active
                    ? "px-3 py-1 bg-[#0f0f10] text-[#e5e7eb] rounded-t-md border-x border-t border-[#2A2A2A]"
                    : "px-3 py-1 text-[#9aa0a6]"
                }
                title={f.name}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full h-[calc(100%-40px)] overflow-auto">
          {shown?.code ? (
           <div className="p-4 h-full overflow-y-auto">
  <Markdown>
    {`\`\`\`${shown.lang || ""}\n${shown.code}\n\`\`\``}
  </Markdown>
</div>



          ) : (
            <div className="p-6 text-[#c7cbd2]">No code found in this message.</div>
          )}
        </div>
      </div>
    </Overlay>
  );
};

// LIVE modal (go live. yeah.)
const LiveModal = ({
  open,
  onClose,
  slug,
  setSlug,
  busy,
  note,
  onPublish,
  baseSuffix = ".surfers.co.in",
  onCheck,
  avail,
  onCopy,
  copied,
  liveUrl,
}) => {
  if (!open) return null;
  const full = slug ? `${slug}${baseSuffix}` : `project-name${baseSuffix}`;
  return (
    <Overlay onClose={onClose}>
      <div className="w-[min(720px,92vw)] rounded-2xl bg-white text-[#222] shadow-2xl p-8 relative">
        <button
          aria-label="close"
          onClick={onClose}
          className="absolute right-5 top-5 text-2xl leading-none text-[#6b7280] hover:text-[#111]"
        >
          ×
        </button>

        <h2 className="text-[48px] font-extrabold tracking-tight mb-6">
          <span className="text-[#333]">go live.</span>{" "}
          <span className="text-[#ff354a]">yeah.</span>
        </h2>

        <div className="mb-2">
          <div className="flex items-stretch gap-2">
            <div className="flex-1 relative">
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
                  )
                }
                placeholder="project-name"
                className="w-full h-12 rounded-xl border border-gray-300 px-4 pr-[160px] text-lg outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">
                {baseSuffix}
              </div>
            </div>

            {/* copy button — turns blue when clicked */}
            <button
              onClick={onCopy}
              className={`h-12 w-12 rounded-xl border ${
                copied
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              }`}
              title="copy full domain"
            >
              {/* copy icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mx-auto">
                <rect
                  x="9"
                  y="9"
                  width="11"
                  height="11"
                  rx="2"
                  stroke={copied ? "#fff" : "#6b7280"}
                  strokeWidth="1.6"
                />
                <rect
                  x="4"
                  y="4"
                  width="11"
                  height="11"
                  rx="2"
                  stroke={copied ? "#fff" : "#6b7280"}
                  strokeWidth="1.6"
                  opacity="0.7"
                />
              </svg>
            </button>
          </div>

          <div className="mt-2">
            <button
              onClick={onCheck}
              className="text-[#1a73e8] text-sm underline underline-offset-2"
              type="button"
            >
              check the availability of domain
            </button>
            {avail === "free" && (
              <span className="ml-2 text-green-600 text-sm">available ✓</span>
            )}
            {avail === "taken" && (
              <span className="ml-2 text-red-600 text-sm">already in use</span>
            )}
          </div>
        </div>

        <button
          onClick={onPublish}
          disabled={busy || !slug}
          className={`mt-4 w-full h-14 rounded-xl text-white text-lg font-semibold ${
            busy ? "bg-red-300" : "bg-[#EF3A3A] hover:bg-[#ff3d3d]"
          }`}
        >
          {"go live. fast. dude"}
        </button>

        {/* live link appears ONLY after publishing */}
        {liveUrl && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-300 bg-gray-50 p-3">
            <div className="text-sm text-gray-700">live link:</div>
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[#1a73e8] underline"
            >
              {/* external-link icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14 5h5v5"
                  stroke="#1a73e8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 14L19 5"
                  stroke="#1a73e8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"
                  stroke="#1a73e8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="break-all">{liveUrl}</span>
            </a>
          </div>
        )}

        <p className="text-gray-600 mt-4">
          making your website live will enable anyone to use it anywhere.
        </p>

        {note && <p className="mt-3 text-sm text-gray-700">{note}</p>}
      </div>
    </Overlay>
  );
};

/* =========================
   MAIN APP
   ========================= */
function SurfersApp() {
  // routing
  const [view, setView] = useState("home");

  // home prompt
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  // attachments
  const [images, setImages] = useState([]);
  const [figmas, setFigmas] = useState([]);
  const [showAttach, setShowAttach] = useState(false);

  // auth
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);

  // phone otp
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  // chat
  const [messages, setMessages] = useState([]); // {id, role, content}
  const [chatInput, setChatInput] = useState("");

  // streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [phase, setPhase] = useState(null);
  const atBottomRef = useRef(true);

  const streamAbortRef = useRef(null);
  const streamBufRef = useRef({ buf: "", t: null });
  const flushNow = (asstId) => {
    if (!streamBufRef.current.buf) return;
    appendToAssistant(asstId, streamBufRef.current.buf);
    streamBufRef.current.buf = "";
  };
  const scheduleFlush = (asstId) => {
    if (streamBufRef.current.t) return;
    streamBufRef.current.t = setTimeout(() => {
      streamBufRef.current.t = null;
      flushNow(asstId);
    }, 120);
  };

  const prevUidRef = useRef(null);
  const [chatImages, setChatImages] = useState([]);
  const [chatFigmas, setChatFigmas] = useState([]);
  const [showChatAttach, setShowChatAttach] = useState(false);
  const chatEndRef = useRef(null);

  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingImages, setPendingImages] = useState([]);

  // NEW modal controller (single source of truth)
  // { type: 'code'|'view'|'live'|null, msgId, code, lang, url, note, files, activeIdx }
  const [modal, setModal] = useState({
    type: null,
    msgId: null,
    code: "",
    lang: "",
    url: "",
    note: "",
    files: [],
    activeIdx: 0,
  });

  // preview/publish
  const [previews, setPreviews] = useState({});
  const [published, setPublished] = useState({});

  // go live modal state
  const [liveSlug, setLiveSlug] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveAvail, setLiveAvail] = useState(null); // null | 'free' | 'taken'
  const [copiedSlug, setCopiedSlug] = useState(false); // NEW
  const [liveResultUrl, setLiveResultUrl] = useState(""); // NEW

  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const attachRef = useRef(null);
  const fileInputRef = useRef(null);

  const chatFormRef = useRef(null);
  const chatTextareaRef = useRef(null);
  const chatAttachRef = useRef(null);
  const chatFileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  // --- subdomain base (prod via env; local falls back to lvh.me trick)
const BASE_DOMAIN =
  import.meta.env.VITE_BASE_DOMAIN ||
  (typeof window !== "undefined" && window.location.hostname.endsWith("lvh.me")
    ? "lvh.me"
    : "surfers.co.in");

const SUBDOMAIN_SUFFIX = `.${BASE_DOMAIN}`;

  const makeAbsoluteUrl = (u) => {
    try {
      return new URL(u, API_URL).toString();
    } catch {
      return u;
    }
  };

  const LINE_HEIGHT_PX = 20;
  const MAX_LINES = 7;
  const MAX_TA_HEIGHT = LINE_HEIGHT_PX * MAX_LINES;

  // typewriter
  const TW_PREFIX = "surfers builds ";
  const TW_LIST = ["games for you", "websites for you", "apps for you", "anything for you"];
  const [twIdx, setTwIdx] = useState(0);
  const [twSub, setTwSub] = useState(0);
  const [twDeleting, setTwDeleting] = useState(false);
  const [blink, setBlink] = useState(true);
  const typewriter = TW_PREFIX + TW_LIST[twIdx].slice(0, twSub) + (blink ? " |" : "  ");

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (prompt) return;
    const full = TW_LIST[twIdx];
    const typingDelay = 150,
      deletingDelay = 25,
      holdAtEnd = 450,
      holdAtStart = 120;
    let timer;
    if (!twDeleting) {
      if (twSub < full.length) timer = setTimeout(() => setTwSub(twSub + 1), typingDelay);
      else timer = setTimeout(() => setTwDeleting(true), holdAtEnd);
    } else {
      if (twSub > 0) timer = setTimeout(() => setTwSub(twSub - 1), deletingDelay);
      else
        timer = setTimeout(() => {
          setTwDeleting(false);
          setTwIdx((twIdx + 1) % TW_LIST.length);
        }, holdAtStart);
    }
    return () => clearTimeout(timer);
  }, [prompt, twIdx, twSub, twDeleting]);

  useEffect(() => {
    if (!chatEndRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        atBottomRef.current = entry.isIntersecting;
      },
      { root: null, threshold: 0.01, rootMargin: "0px 0px -96px 0px" }
    );
    observer.observe(chatEndRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      const newUid = currentUser?.uid || null;
      if (newUid !== prevUidRef.current) clearConversationState();
      setUser(currentUser);
      prevUidRef.current = newUid;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user && pendingPrompt) {
      const toSend = pendingPrompt;
      const imgs = pendingImages;
      setPendingPrompt("");
      setPendingImages([]);
      setAuthOpen(false);
      setView("chat");
      setTimeout(() => {
        sendMessageStream(toSend, imgs);
        setPrompt("");
        setImages([]);
        setFigmas([]);
      }, 0);
    }
  }, [user, pendingPrompt, pendingImages]);

  useEffect(() => () => stopStreaming(), []);
  useEffect(() => {
    if (view === "home") stopStreaming();
  }, [view]);

  const resetPhoneAuth = () => {
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setConfirmation(null);
    try {
      if (typeof window !== "undefined" && window.recaptchaVerifier) {
        window.recaptchaVerifier.clear?.();
        window.recaptchaVerifier = null;
      }
    } catch {}
  };
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      resetPhoneAuth();
      setAuthOpen(false);
    } catch (err) {
      console.error(err);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    } finally {
      resetPhoneAuth();
      setAuthOpen(false);
      clearConversationState();
      setView("home");
    }
  };
  const sendOtp = async () => {
    try {
      if (typeof window !== "undefined" && !window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );
      setConfirmation(confirmationResult);
      setOtpSent(true);
    } catch (err) {
      console.error("OTP error:", err);
      alert("Failed to send OTP. Format: +91xxxxxxxxxx");
    }
  };
  const verifyOtp = async () => {
    try {
      if (confirmation) {
        await confirmation.confirm(otp);
        resetPhoneAuth();
        setAuthOpen(false);
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      alert("Invalid OTP");
    }
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TA_HEIGHT);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > MAX_TA_HEIGHT ? "auto" : "hidden";
  };
  useEffect(() => {
    resizeTextarea();
  }, [prompt]);

  const resizeChatTextarea = () => {
    const el = chatTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TA_HEIGHT);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > MAX_TA_HEIGHT ? "auto" : "hidden";
  };
  useEffect(() => {
    resizeChatTextarea();
  }, [chatInput]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (view === "home" && textareaRef.current) textareaRef.current.focus();
      if (view === "chat" && chatTextareaRef.current) chatTextareaRef.current.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  useEffect(() => {
    if (view === "chat") chatTextareaRef.current?.focus();
  }, [view]);

  useEffect(() => {
    if (!showAttach) return;
    const onClick = (e) => {
      if (attachRef.current && !attachRef.current.contains(e.target)) setShowAttach(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setShowAttach(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showAttach]);
  useEffect(() => {
    if (!showChatAttach) return;
    const onClick = (e) => {
      if (chatAttachRef.current && !chatAttachRef.current.contains(e.target))
        setShowChatAttach(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setShowChatAttach(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showChatAttach]);

  const onAddImageClick = () => {
    fileInputRef.current?.click();
    setShowAttach(false);
  };
  const onFilesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f), name: f.name }));
    setImages((prev) => [...prev, ...previews]);
    e.target.value = "";
  };
  const onAddFigmaClick = () => {
    const url = window.prompt("Paste Figma link:");
    if (!url) return;
    const ok = /figma\.com\/(file|design)\//i.test(url);
    if (!ok) {
      alert("That doesn't look like a Figma file link.");
      return;
    }
    setFigmas((prev) => [...prev, url]);
    setShowAttach(false);
  };
  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const removeFigma = (i) => setFigmas((prev) => prev.filter((_, idx) => idx !== i));

  const onAddImageClickChat = () => {
    chatFileInputRef.current?.click();
    setShowChatAttach(false);
  };
  const onFilesPickedChat = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f), name: f.name }));
    setChatImages((prev) => [...prev, ...previews]);
    e.target.value = "";
  };
  const onAddFigmaClickChat = () => {
    const url = window.prompt("Paste Figma link:");
    if (!url) return;
    const ok = /figma\.com\/(file|design)\//i.test(url);
    if (!ok) {
      alert("That doesn't look like a Figma file link.");
      return;
    }
    setChatFigmas((prev) => [...prev, url]);
    setShowChatAttach(false);
  };
  const removeChatImage = (i) =>
    setChatImages((prev) => prev.filter((_, idx) => idx !== i));
  const removeChatFigma = (i) =>
    setChatFigmas((prev) => prev.filter((_, idx) => idx !== i));

  const addAssistantPlaceholder = () => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, role: "assistant", content: "", streaming: true }]);
    return id;
  };

  const appendToAssistant = (id, chunk) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, content: (m.content || "") + (chunk || ""), className: "transition-all duration-200" }
          : m
      )
    );
  };

  const stopStreaming = (reason = "manual-stop") => {
    try {
      streamAbortRef.current?.abort?.(reason);
    } catch {}
    streamAbortRef.current = null;
    setIsStreaming(false);
    setPhase(null);
  };

  const clearConversationState = () => {
    stopStreaming();
    setMessages([]);
    setChatInput("");
    setPrompt("");
    setImages([]);
    setChatImages([]);
    setFigmas([]);
    setChatFigmas([]);
    setCode("");
    setIsStreaming(false);
    setPhase(null);
    setPreviews({});
    setPublished({});
    setModal({ type: null, msgId: null, code: "", lang: "", url: "", note: "", files: [], activeIdx: 0 });
    setLiveBusy(false);
    setLiveAvail(null);
    setLiveResultUrl("");
    setCopiedSlug(false);
  };

  // STREAMING — raw body from /api/stream-es
  async function sendMessageStream(text, attachments = []) {
    const userId = Date.now();
    setMessages((prev) => [...prev, { id: userId, role: "user", content: text }]);
    const asstId = addAssistantPlaceholder();
    streamBufRef.current.buf = "";
    if (streamBufRef.current.t) {
      clearTimeout(streamBufRef.current.t);
      streamBufRef.current.t = null;
    }

    const hist = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    const formData = new FormData();
    formData.append("prompt", text);
    formData.append("history", JSON.stringify(hist));
    attachments.forEach((img) => {
      if (img?.file) formData.append("images", img.file, img.name || "image.png");
    });

    const ac = new AbortController();
    streamAbortRef.current = ac;

    let idleTimer = null,
      hardCapTimer = null;
    const armTimers = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => ac.abort("idle-timeout"), STREAM_INACTIVITY_MS);
      if (!hardCapTimer && STREAM_MAX_DURATION_MS > 0) {
        hardCapTimer = setTimeout(() => ac.abort("max-duration"), STREAM_MAX_DURATION_MS);
      }
    };
    const clearTimers = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (hardCapTimer) clearTimeout(hardCapTimer);
      idleTimer = null;
      hardCapTimer = null;
    };

    let gotAny = false;

    try {
      setIsStreaming(true);
      armTimers();

      const res = await fetch(`${API_URL}/api/stream-es`, {
        method: "POST",
        body: formData,
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body (streaming)");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const ingestor = makeStreamIngestor(
        (t) => {
          streamBufRef.current.buf += t;
          scheduleFlush(asstId);
          if (/\S/.test(t)) gotAny = true;
          if (/```|\b(import|class|def|function|const|let|var)\b/.test(t)) setPhase("coding");
        },
        () => {}
      );
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        if (chunkStr) ingestor.feed(chunkStr);
        armTimers();
      }
      ingestor.end();
      flushNow(asstId);

      // --- FINAL CLEANUP: ensure no stray [DONE] lines remain ---
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstId
            ? {
                ...m,
                content: (m.content || "").replace(/^\s*(?:data:\s*)?\[DONE\]\s*$/gm, ""),
              }
            : m
        )
      );
    } catch (err) {
      const msg = String(err?.name || err || "");
      const reason = "message" in (err || {}) ? String(err.message) : msg;
      if (
        !/AbortError/i.test(msg) &&
        !/AbortError/i.test(reason) &&
        !/manual-stop|new-message|idle-timeout|max-duration/.test(reason)
      ) {
        appendToAssistant(asstId, `\n// stream error: ${String(err)}`);
      }
    } finally {
      clearTimers();
      if (streamAbortRef.current === ac) streamAbortRef.current = null;
      if (!gotAny)
        appendToAssistant(asstId, "\n// (no content received — check server logs or network)");
      setPhase(null);
      setIsStreaming(false);
    }
  }

  // submit handlers
  async function onSubmit(e) {
    e.preventDefault();
    if (isStreaming) stopStreaming("new-message");
    if (!prompt.trim() && images.length === 0) return;

    const first = prompt.trim();
    const imgs = images;

    if (!user) {
      setPendingPrompt(first);
      setPendingImages(imgs);
      setPrompt("");
      setImages([]);
      setFigmas([]);
      setAuthOpen(true);
      return;
    }

    setPrompt("");
    setImages([]);
    setFigmas([]);
    setView("chat");
    setTimeout(() => sendMessageStream(first, imgs), 0);
  }

  const sendFromChat = (e) => {
    e.preventDefault();
    if (isStreaming) stopStreaming("new-message");
    if (!chatInput.trim() && chatImages.length === 0) return;

    const txt = chatInput.trim();
    const imgs = chatImages;

    if (!user) {
      setPendingPrompt(txt);
      setPendingImages(imgs);
      setChatInput("");
      setChatImages([]);
      setChatFigmas([]);
      setAuthOpen(true);
      return;
    }

    setChatInput("");
    setChatImages([]);
    setChatFigmas([]);
    setTimeout(() => sendMessageStream(txt, imgs), 0);
  };

  const getMsgById = (id) => messages.find((m) => m.id === id);

  // preview builder
  async function buildOrUpdatePreview(msgId) {
    const msg = getMsgById(msgId);
    const parsed = parseGeneratedCode(msg?.content || "");
    if (!parsed.code || !parsed.code.trim()) {
      setModal((m) => ({ ...m, note: "No usable code found in this message." }));
      return null;
    }
    const existing = previews[msgId];
    const payload = {
      code: parsed.code,
      lang: parsed.lang || "html",
      artifactId: existing?.artifactId || null,
    };

    try {
      const res = await fetch(`${API_URL}/api/preview/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setModal((m) => ({ ...m, note: `build failed: ${txt || res.status}` }));
        return null;
      }
      const data = await res.json();
      const absUrl = makeAbsoluteUrl(data.previewUrl);
      const next = { artifactId: data.artifactId, url: absUrl };
      setPreviews((p) => ({ ...p, [msgId]: next }));
      return next;
    } catch (err) {
      setModal((m) => ({ ...m, note: `build failed: ${String(err)}` }));
      return null;
    }
  }

  // open modals
  const openCodeModal = (id) => {
    const msg = getMsgById(id);
    const files = extractFilesFromText(msg?.content || "");
    const first = files[0] || { code: "", lang: "plaintext" };
    setModal({
      type: "code",
      msgId: id,
      code: first.code || "",
      lang: first.lang || "plaintext",
      url: "",
      note: "",
      files,
      activeIdx: 0,
    });
  };

  const openViewModal = async (id) => {
    setModal({ type: "view", msgId: id, code: "", lang: "", url: "", note: "", files: [], activeIdx: 0 });
    const built = await buildOrUpdatePreview(id);
    if (built?.url)
      setModal((m) => ({
        ...m,
        url: `${built.url}${built.url.includes("?") ? "&" : "?"}t=${Date.now()}`,
      }));
  };

  const openLiveModal = async (id) => {
    // ensure preview exists
    let prev = previews[id];
    if (!prev?.artifactId) {
      const built = await buildOrUpdatePreview(id);
      if (!built) {
        alert("Failed to build preview before publishing.");
        return;
      }
      prev = built;
    }
    const defaultSlug = `proj-${(user?.uid || "anon").slice(0, 6)}-${String(id)
      .slice(-4)
      .toLowerCase()}`;
    setLiveSlug(defaultSlug);
    setLiveBusy(false);
    setLiveAvail(null);
    setCopiedSlug(false);
    setLiveResultUrl("");
    setModal({ type: "live", msgId: id, code: "", lang: "", url: "", note: "", files: [], activeIdx: 0 });
  };

  const closeModal = () => {
    setModal({ type: null, msgId: null, code: "", lang: "", url: "", note: "", files: [], activeIdx: 0 });
    setLiveBusy(false);
    setLiveAvail(null);
    setLiveResultUrl("");
    setCopiedSlug(false);
  };

  // chat bubble text: strip all code (fenced + full HTML docs) and strip bare "index.html" lines
  const stripFenced = (t) => (t || "").replace(/```[\s\S]*?```/g, "");
  const stripHtmlDoc = (t) =>
    (t || "").replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, "").replace(/<html[\s\S]*?<\/html>/gi, "");
  const stripIndexHtmlMention = (t) =>
    (t || "").replace(/^\s*index\.html\s*:?\s*$/gim, "");
  const stripGeneratedCodeFromChat = (t) =>
    stripIndexHtmlMention(stripHtmlDoc(stripFenced(t)));
  // --- NEW: auto-close unbalanced code fences ---
function safeWrapCode(text) {
  if (!text) return "";
  const count = (text.match(/```/g) || []).length;
  // If odd → missing closing fence → add it
  if (count % 2 !== 0) {
    return text + "\n```";
  }
  return text;
}


  // --- NEW: sticky action dock targets the latest assistant message
  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && (m.content ?? "").trim() !== "") return m.id;
    }
    return null;
  })();
  const showStickyActions = !!lastAssistantId && !isStreaming;

  // publish helpers
  const publishCurrent = async () => {
    const msgId = modal.msgId;
    const prev = previews[msgId];
    if (!prev?.artifactId) {
      setModal((m) => ({ ...m, note: "No preview artifact. Try View first." }));
      return;
    }
    const slug = liveSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!slug) {
      setModal((m) => ({ ...m, note: "Invalid slug." }));
      return;
    }
    try {
      setLiveBusy(true);
      const res = await fetch(`${API_URL}/api/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, artifactId: prev.artifactId }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setModal((m) => ({ ...m, note: `Publish failed: ${t || res.status}` }));
        setLiveBusy(false);
        return;
      }
      const data = await res.json();
      const liveAbs = makeAbsoluteUrl(data.liveUrl);
      setPublished((p) => ({ ...p, [data.project]: data.artifactId }));
      setLiveResultUrl(liveAbs); // NEW: show link below button
      setModal((m) => ({ ...m, note: "Live!" }));
      setLiveBusy(false);
    } catch (err) {
      setModal((m) => ({ ...m, note: `Publish failed: ${String(err)}` }));
      setLiveBusy(false);
    }
  };

  const checkAvailability = async () => {
    const slug = liveSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!slug) {
      setLiveAvail(null);
      return;
    }
    try {
      // If GET /live/:slug/ returns 200, it's taken; 404 means free
      const res = await fetch(`${API_URL}/live/${slug}/`, { method: "HEAD" });
      setLiveAvail(res.ok ? "taken" : "free");
    } catch {
      try {
        const res2 = await fetch(`${API_URL}/live/${slug}/`, { method: "GET" });
        setLiveAvail(res2.ok ? "taken" : "free");
      } catch {
        setLiveAvail(null);
      }
    }
  };

  // copy full domain for go-live (turns button blue briefly)
  const copySlugFull = async () => {
    const full = `${liveSlug}${SUBDOMAIN_SUFFIX}`; // with ".surfers.co.in" subdomain
    try {
      await navigator.clipboard?.writeText(full);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 1200);
    } catch {}
  };

  return (
    <div
  className="relative min-h-screen text-[#EDEDED] font-wix madefor text flex flex-col"
  style={{ scrollbarGutter: "stable" }}
>


  {view === "home" && (
  <div
    aria-hidden="true"
    className="fixed inset-0 z-0"
    style={{
      backgroundImage: "url('/background.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  />
)}


      {/* ===== TOP BAR (home) ===== */}
      {view === "home" && (
  <header className="relative z-10 pt-5">
    <Container>
      <div className="text-center">
        <h1 className="text-white font-extrabold  leading-[0.85]
                       text-[40px] sm:text-[56px] md:text-[65px]">
          surfers<br/> codes anything for<br/> you.<br className="hidden sm:block" /> yeah. 
        </h1> <br />

        <div className="mt-6 flex justify-center">
          {user ? (
            <button
              onClick={handleLogout}
              className="px-15 py-1.5 rounded-full border border-white/80 text-white
                         hover:bg-white hover:text-black transition"
            >
              log out
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="px-15 py-1.5 rounded-full border border-white/80 text-white
                         hover:bg-white hover:text-black transition"
            >
              sign up / log in
            </button>
          )}
        </div>
      </div>
    </Container>
  </header>
)}


      {/* ===== HOME ===== */}
      {view === "home" && (
        <main className="relative z-10 flex-1">
  {/* subtle dark overlay so white text stays readable */}
  <div className="absolute inset-0  pointer-events-none" />

          <Container className="flex flex-col items-center justify-center min-h-[72vh]">
            <LogoLarge className="h-[100px] w-[95px] mb-5" />
            <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-[560px] mx-auto">
              <div className="relative bg-[#FFFFFF] border-[#2A2A2A] rounded-[32px] px-[15px] pt-[35px] pb-[65px] shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                {(images.length > 0 || figmas.length > 0) && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div
                        key={`img-${i}`}
                        className="relative h-[68px] w-[88px] rounded-[10px] overflow-hidden border border-[#2A2A2A]"
                      >
                        <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[12px] flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {figmas.map((url, i) => (
                      <div
                        key={`fig-${i}`}
                        className="group flex items-center gap-2 px-3 py-2 rounded-[10px] border border-[#2A2A2A] text-[#C8CCD2]"
                        title={url}
                      >
                        <FigmaIcon />
                        <span className="max-w-[180px] truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => removeFigma(i)}
                          className="ml-1 h-5 w-5 rounded-full bg-[#1B1B1C] hover:bg-[#222] text-white text-[12px] flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!prompt && (
                  <div
                    className="pointer-events-none absolute left-[25px] right-[18px] top-[16px] text-[18px] leading-[20px] text-[#191919] select-none"
                    aria-hidden="true"
                  >
                    {typewriter}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onInput={resizeTextarea}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      formRef.current?.requestSubmit();
                    }
                  }}
                  className="w-full bg-transparent outline-none absolute left-[25px] right-[18px] top-[16px] text-[18px] leading-[20px] text-[#191919] select-none resize-none"
                  style={{ maxHeight: `${MAX_TA_HEIGHT}px` }}
                />

                <div className="absolute left-[18px] right-[18px] bottom-[12px] flex items-center justify-between">
                  <div className="relative" ref={attachRef}>
                    <button
                      type="button"
                      aria-label="add"
                      onClick={() => setShowAttach((v) => !v)}
                      className="text-[#C8CCD2] text-[18px] leading-none hover:text-white transition-colors"
                    >
                      +
                    </button>
                    {showAttach && (
                      <div className="absolute -top-2 left-0 -translate-y-full w-[180px] rounded-[12px] bg-white text-black border border-neutral-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)] p-2">
                        <button
                          type="button"
                          onClick={onAddImageClick}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100"
                        >
                          <ImageIcon /> <span className="text-[14px] text-neutral-800">add image</span>
                        </button>
                        <button
                          type="button"
                          onClick={onAddFigmaClick}
                          className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100"
                        >
                          <FigmaIcon /> <span className="text-[14px] text-neutral-800">add figma</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    aria-label="send"
                    disabled={loading}
                    className={`h-[32px] w-[32px] rounded-full ${
                      loading
                        ? "bg-[#2A2A2B] text-[#9AA0A6]"
                        : "bg-[#1A1A1B] hover:bg-[#232325] text-[#DADDE2]"
                    } flex items-center justify-center transition-colors`}
                  >
                    {loading ? "…" : "↑"}
                  </button>
                </div>
              </div>

              {code ? (
                <div className="w-full max-w-[560px] mt-4">
                  <pre className="whitespace-pre-wrap text-[12px] leading-5 text-[#C9D1D9] bg-[#111214] border border-[#2A2A2A] rounded-[12px] p-4 overflow-x-auto">
                    {code}
                  </pre>
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onFilesPicked}
              />
            </form>
          </Container>
        </main>
      )}

      {/* ===== CHAT PAGE ===== */}
      {view === "chat" && (
        <>
          <header className="pt-4">
            <Container>
              <div className="relative h-[28px] flex items-center">
                <button
                  onClick={() => {
                    stopStreaming();
                    setView("home");
                  }}
                  className="mr-2"
                >
                  <BackArrow className="h-[18px] w-[18px]}" />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
                  <LogoSmall className="h-[18px] w-[18px]" />
                </div>
                <div className="ml-auto cursor-pointer" onClick={() => setAuthOpen(true)}>
                  <ProfileIcon className="h-[18px] w-[18px]" />
                </div>
              </div>
            </Container>
          </header>

          <main className="flex-1">
            <Container className="pt-8 pb-40">
              {messages.map((m) => {
                const isAssistant = m.role === "assistant";
                const hasContent = (m.content ?? "").trim() !== "";
                const cleaned = isAssistant
                  ? stripGeneratedCodeFromChat(m.content || "")
                  : m.content || "";
                const textToShow =
                  (cleaned || "").trim() ||
                  (isAssistant ? "_generated code ready — use the buttons below._" : "");

                // hide inline actions on the LAST assistant msg when sticky dock is visible
                const showInlineActionButtons =
                  !showStickyActions || m.id !== lastAssistantId;

                return (
                  <div
                    id={`msg-${m.id}`}
                    key={m.id}
                    className={`mb-4 flex ${isAssistant ? "justify-start" : "justify-end"}`}
                    style={{
                      contain: "layout paint",
                      willChange: "contents",
                      transform: "translateZ(0)",
                    }}
                  >
                    <div
                      className={`max-w-[720px] rounded-2xl px-4 py-3 leading-6 ${
                        isAssistant ? "bg-transparent text-[#EDEDED]" : "bg-[#1A1A1B] text-[#EDEDED]"
                      }`}
                      style={{
                        overflowWrap: "anywhere",
                        contain: "content",
                        backfaceVisibility: "hidden",
                        transform: "translateZ(0)",
                      }}
                    >
                      {isAssistant ? (
                        hasContent ? (
                          <>
                            <Markdown>{textToShow}</Markdown>

                            {!isStreaming && showInlineActionButtons && (
                              <div className="mt-10 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => openCodeModal(m.id)}
                                  className="px-4 py-1.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1B] hover:bg-[#232325] text-[#EDEDED]"
                                >
                                  code
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openViewModal(m.id)}
                                  className="px-4 py-1.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1B] hover:bg-[#232325] text-[#EDEDED]"
                                >
                                  view
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openLiveModal(m.id)}
                                  className="px-4 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#FFFFFF] text-black"
                                >
                                  go live
                                </button>
                              </div>
                            )}
                          </>
                        ) : isStreaming ? (
                          <div
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2A2A2A] bg-[#111214] text-[#C8CCD2] text-[12px]"
                            aria-live="polite"
                          >
                            <Spinner />
                            <span>{phase === "coding" ? "writing code…" : "writing…"}</span>
                          </div>
                        ) : null
                      ) : (
                        <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </Container>
          </main>

          {/* input row + NEW centered action dock */}
          <div className="fixed left-0 right-0 bottom-0 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/90 to-transparent pt-6 pb-6">
            <Container>
              {/* --- Sticky action dock (centered above prompt) --- */}
              {showStickyActions && (
                <div className="w-full max-w-[720px] mx-auto mb-4 text-center">
                  <p className="relative inline-block text-[16px] leading-5 text-[#D1D5DB] opacity-90 mb-3">
                    You can see the code, view to see the site or go live or ask surfers for
                    anything.
                    {/* little arrow pointing down to the prompt box */}
                    <svg
                      width="120"
                      height="26"
                      viewBox="0 0 120 26"
                      fill="none"
                      className="absolute -bottom-5 left-1/2 -translate-x-1/2"
                      aria-hidden="true"
                    >
                      <path d="M5 2 C 40 2, 80 2, 115 2" stroke="#6B7280" strokeWidth="1.2" opacity="0.45" />
                      <path d="M60 2 L60 18" stroke="#6B7280" strokeWidth="1.2" opacity="0.45" />
                      <path d="M60 18 L56 14 M60 18 L64 14" stroke="#6B7280" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
                    </svg>
                  </p>
                  <div className="flex w-full max-w-[560px] mx-auto gap-3">
  <button
    type="button"
    onClick={() => openCodeModal(lastAssistantId)}
    disabled={!lastAssistantId}
    className="flex-1 h-10 rounded-full border border-[#2A2A2A] bg-[#1A1A1B] hover:bg-[#232325] text-[#EDEDED]"
  >
    code
  </button>
  <button
    type="button"
    onClick={() => openViewModal(lastAssistantId)}
    disabled={!lastAssistantId}
    className="flex-1 h-10 rounded-full bg-white text-black"
  >
    view
  </button>
  <button
    type="button"
    onClick={() => openLiveModal(lastAssistantId)}
    disabled={!lastAssistantId}
    className="flex-1 h-10 rounded-full bg-[#EF3A3A] hover:bg-[#ff3d3d] text-white"
  >
    go live
  </button>
</div>

                </div>
              )}

              <form ref={chatFormRef} onSubmit={sendFromChat} className="w-full max-w-[560px] mx-auto">
                <div className="relative bg-[#121214] border-[0.5px] border-[#2A2A2A] rounded-[28px] px-[18px] pt-[12px] pb-[40px] shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                  {(chatImages.length > 0 || chatFigmas.length > 0) && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {chatImages.map((img, i) => (
                        <div
                          key={`cimg-${i}`}
                          className="relative h-[68px] w-[88px] rounded-[10px] overflow-hidden border border-[#2A2A2A]"
                        >
                          <img
                            src={img.url || URL.createObjectURL(img.file)}
                            alt={img.name}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeChatImage(i)}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[12px] flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {chatFigmas.map((url, i) => (
                        <div
                          key={`cfig-${i}`}
                          className="group flex items-center gap-2 px-3 py-2 rounded-[10px] border border-[#2A2A2A] text-[#C8CCD2]"
                          title={url}
                        >
                          <FigmaIcon />
                          <span className="max-w-[180px] truncate">{url}</span>
                          <button
                            type="button"
                            onClick={() => removeChatFigma(i)}
                            className="ml-1 h-5 w-5 rounded-full bg-[#1B1B1C] hover:bg-[#222] text-white text-[12px] flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    ref={chatTextareaRef}
                    rows={1}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onInput={resizeChatTextarea}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        chatFormRef.current?.requestSubmit();
                      }
                    }}
                    placeholder="build anything fantastic."
                    className="w-full bg-transparent outline-none text-[16px] leading-[20px] placeholder:text-[#9AA0A6] text-[#EDEDED] resize-none"
                    style={{ maxHeight: `${MAX_TA_HEIGHT}px` }}
                  />

                  <div className="absolute left-[18px] right-[18px] bottom-[12px] flex items-center justify-between">
                    <div className="relative" ref={chatAttachRef}>
                      <button
                        type="button"
                        aria-label="add"
                        onClick={() => setShowChatAttach((v) => !v)}
                        className="text-[#C8CCD2] text-[18px] leading-none hover:text-white transition-colors"
                      >
                        +
                      </button>
                      {showChatAttach && (
                        <div className="absolute -top-2 left-0 -translate-y-full w-[180px] rounded-[12px] bg-white text-black border border-neutral-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)] p-2">
                          <button
                            type="button"
                            onClick={onAddImageClickChat}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100"
                          >
                            <ImageIcon /> <span className="text-[14px] text-neutral-800">add image</span>
                          </button>
                          <button
                            type="button"
                            onClick={onAddFigmaClickChat}
                            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100"
                          >
                            <FigmaIcon /> <span className="text-[14px] text-neutral-800">add figma</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="h-[28px] w-[28px] rounded-full bg-[#1A1A1B] hover:bg-[#232325] text-[#DADDE2] flex items-center justify-center transition-colors"
                      aria-label="send"
                    >
                      ↑
                    </button>
                  </div>
                </div>

                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onFilesPickedChat}
                />
              </form>
            </Container>
          </div>
        </>
      )}

      {/* ===== FOOTER ===== */}
      {view === "home" && (
        <footer className="relative z-10 pb-[22px]">
          <Container>
            <p className="mx-auto text-center text-[13.8px] leading-[18px] text-[#9AA0A6]">
              privacy policy  •  terms &amp; use  •  type it. see it. launch it. —— your ideas
              live in seconds. surfers codes anything better. faster.  •  2025 © surfers · {VERSION_TAG}
            </p>
          </Container>
        </footer>
      )}

      {/* ===== AUTH LIGHTBOX ===== */}
      {authOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-[90]">
          <div className="w-[400px] text-center p-8 rounded-xl bg-black border border-gray-800">
            <h1 className="text-3xl font-bold">account.</h1>
            <p className="text-gray-400 mb-6">create or log in.</p>

            {user ? (
              <>
                <p className="mb-4">
                  Welcome, {user.displayName || user.phoneNumber || user.email}
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-[#FFFFFF] text-[#191919] font-medium rounded-lg"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="bg-[#1a73e8] text-white font-medium w-full py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <span className="font-bold">G</span> continue with Google
                </button>

                <div className="my-4 flex items-center">
                  <div className="flex-grow border-t border-gray-600"></div>
                  <span className="px-2 text-gray-400">or</span>
                  <div className="flex-grow border-t border-gray-600"></div>
                </div>

                {!otpSent ? (
                  <>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-white text-[#232323] font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendOtp}
                      className="w-full mt-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                    >
                      send OTP
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="enter OTP"
                      className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-white text-[#232323] font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={verifyOtp}
                      className="w-full mt-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                    >
                      verify OTP
                    </button>
                  </>
                )}
              </>
            )}

            <div id="recaptcha-container"></div>

            <p className="text-gray-400 text-xs mt-6">
              privacy policy • terms &amp; use • type it.<br />
              your ideas live in seconds. surfers codes anything better. faster.<br />
              © 2025 surfers
            </p>

            <button
              onClick={() => {
                setAuthOpen(false);
              }}
              className="mt-4 text-sm text-gray-400 underline"
            >
              close
            </button>
          </div>
        </div>
      )}

      {/* ===== NEW MODALS (only one ever renders at once) ===== */}
      <CodeModal
        open={modal.type === "code"}
        files={modal.files}
        lang={modal.lang}
        code={modal.code}
        onClose={closeModal}
      />
      <ViewModal open={modal.type === "view"} url={modal.url} onClose={closeModal} />
     <LiveModal
  open={modal.type === "live"}
  onClose={closeModal}
  slug={liveSlug}
  setSlug={setLiveSlug}
  busy={liveBusy}
  note={modal.note}
  onPublish={publishCurrent}
  onCheck={checkAvailability}
  avail={liveAvail}
  onCopy={copySlugFull}
  copied={copiedSlug}
  liveUrl={liveResultUrl}
  baseSuffix={SUBDOMAIN_SUFFIX}   // ✅ added
/>

    </div>
  );
}

/* =========================
   Export
   ========================= */
export default function App() {
  return (
    <ErrorBoundary>
      <SurfersApp />
    </ErrorBoundary>
  );
}
