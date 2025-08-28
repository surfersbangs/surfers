// App.jsx
import { useState, useRef, useEffect } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark-dimmed.css";

import React from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";


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

// Chat output rail: 5vw margins on small/medium, 20vw on large+.
// NOTE: The prompt box is NOT inside this rail per your instruction.
const Rail = ({ children, className = "" }) => (
  <div className={`mx-auto ml-[5vw] mr-[5vw] lg:ml-[20vw] lg:mr-[20vw] ${className}`}>{children}</div>
);

const LogoSmall = ({ className = "h-5 w-5" }) => (
  <img src="/logowhite.png" alt="surfers logo" className={className} />
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
      <circle cx="12" cy="12" r="20" opacity="0.25" />
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

  const isSingleLine = !raw.includes("\n");

  useEffect(() => {
    if (inline || isSingleLine) return;
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

  return (
   <pre className="overflow-x-auto">
  <code
    ref={codeRef}
    style={{ background: "transparent" }}
    className={`block p-3 text-[#EDEDED] ${className || ""}`}
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
// show action row only when the output actually contains code
const HAS_REAL_CODE_RE =
  /```[\s\S]*?```|<\/?(?:html|head|body|script|style|div|section|main|canvas)\b|^\s*(?:<!DOCTYPE|#include|import\s+|class\s+\w+|def\s+\w+\(|function\s+\w+\(|(?:const|let|var)\s+\w+\s*=)/mi;

function outputHasActualCode(t = "") {
  return HAS_REAL_CODE_RE.test(t || "");
}


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
  if (t.startsWith(".")) return true;
  if (t.includes(".")) return true;
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

    const info = (startMatch[1] || "").trim();
    const startIdx = i;
    const codeLines = [];
    i++;
    while (i < lines.length && !/^\s*```/.test(lines[i])) {
      codeLines.push(lines[i]);
      i++;
    }

    let filename = null;
    let lang = "";

    if (isLikelyFilenameToken(info)) {
      filename = info.replace(/:$/, "");
      lang = extFromFilename(filename);
    } else {
      lang = normalizeLang(info);
    }

    if (!filename) {
      for (let k = startIdx - 1, tries = 0; k >= 0 && tries < 4; k--, tries++) {
        let probe = lines[k].trim();
        if (!probe) continue;
        probe = probe.replace(/^[-*]\s+/, "");
        probe = probe.replace(/^#{1,6}\s+/, "");
        if (isLikelyFilenameToken(probe)) {
          filename = probe.replace(/:$/, "");
          if (!lang) lang = extFromFilename(filename);
          break;
        }
      }
    }

    if (!lang) lang = "plaintext";
    if (!filename) filename = defaultNameForLang(lang, files.length);

    files.push({
      name: filename,
      lang,
      code: codeLines.join("\n"),
    });
  }

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
  let mode = "unknown";
  let buf = "";

  const stripDone = (s = "") => s.replace(/\[DONE\]/g, "");


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
   MODALS
   ========================= */

const Overlay = ({ children, onClose }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70">
   
    {children}
  </div>
);

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
      <div className="w-[min(1050px,95vw)] h-[min(86vh,820px)] rounded-2xl overflow-hidden shadow-2xl  border border-[#424242] bg-[#1b1b1c]">
        {/* White top bar with URL + lock */}
{/* White top bar with centered lock + URL */}
<div className="relative h-10 bg-white text-[#111] flex items-center justify-center rounded-t-2xl border-b border-[#E5E7EB]">
  {/* Centered lock + URL */}
  <div className="flex items-center  gap-2 text-[15px] text-[#0A0A0A] font-medium">
    <img src="/lock.png" alt="secure" className="h-3.5 w-3.5" />
    <span className="opacity-90">{label || "localhost/surfers/view"}</span>
  </div>

  {/* Close button (top right, plain ×) */}
  <button
    aria-label="close"
    onClick={onClose}
    className="absolute right-3 px -3 top-1/2 -translate-y-1/2 text-[28px] opacity-80 leading-none"
    title="Close"
  >
    ×
  </button>
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
  const handleZipDownload = async () => {
  try {
    const zip = new JSZip();
    zip.file("README.txt", "Exported from Surfers CodeModal\n");
    tabFiles.forEach((f, idx) => {
      const name = (f.name && f.name.trim()) || defaultNameForLang(f.lang || "plaintext", idx);
      zip.file(name, f.code ?? "");
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "surfers-export.zip");
  } catch (e) {
    console.error("zip error", e);
    alert("Failed to create ZIP. See console for details.");
  }
};


  return (
    <Overlay onClose={onClose}>
     <div className="w-[min(980px,94vw)] h-[min(82vh,760px)] rounded-2xl overflow-hidden shadow-2xl bg-[#111214]">

        {/* White top bar */}
        
<div className="relative h-9 bg-[#0A0A0A] text-[#FFFFFF] flex items-center py-1 px-3 justify-center rounded-t-2xl">
  {/* left: download (icon + label) */}
  <button
    type="button"
    onClick={handleZipDownload}
    className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center px-3 gap-2 font-regular text-[15px]"
  >
    
    <span>download files</span>
  </button>

  {/* centered title */}
  <span className="text-[16px] font-regular">&lt;code/&gt;</span>

  {/* right: plain close (no hover styles/colors) */}
  <button
    aria-label="close"
    onClick={onClose}
    className="absolute right-3 px -3 top-1/2 -translate-y-1/2 text-[28px] opacity-80 leading-none"
    title="Close"
  >
    ×
  </button>
</div>


  {/* Tabs row */}
<div className="h-9] text-[15px] bg-[#151515] flex font-medium items-center gap-2 px-3 py-1 overflow-x-auto">
  {tabFiles.map((f, idx) => (
    <button
      key={`${f.name}-${idx}`}
      type="button"
      onClick={() => setActive(idx)}
      className={
        (idx === active
          ? " text-[#FFFFFF]"
          : "text-[#9F9F9F]") +
        " inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] shrink-0"
      }
      title={f.name}
    >
      <span className="whitespace-nowrap">{f.name}</span>
    </button>
  ))}
</div>

        <div className="w-full bg-[#0A0A0A] h-[calc(100%-40px-36px)] overflow-auto">

          {shown?.code ? (
            <div className="py-3 px-2 h-full overflow-y-auto">
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

const LiveModal = ({
  open,
  onClose,
  slug,
  setSlug,
  busy,
  note,
  onPublish,
  avail,
  liveUrl,
  checkAvailability,
}) => {
  if (!open) return null;
  return (
  <Overlay onClose={onClose}>
    <div className="w-[min(480px,92vw)] rounded-2xl bg-white text-[#222] shadow-2xl p-8 relative text-center">
      {/* Close button */}
      <button
        aria-label="close"
        onClick={onClose}
        className="absolute right-5 top-5 text-2xl leading-none text-[#444]"
      >
        ×
      </button>

      {/* Heading */}
      <h2 className="mb-8">
        <div className="text-[32px] font-bold text-[#191919] leading-none">go.</div>
        <div className="text-[48px] font-bold text-[#191919] leading-none">fast.</div>
      </h2>

      {/* Input box */}
      <div className="mb-3">
        <input
          value={slug}
          onChange={(e) => {
            const val = e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
            setSlug(val);
            checkAvailability(val); // auto-check while typing
          }}
          placeholder="project-name"
          className="w-full h-12 rounded-full border border-gray-300 text-center text-lg font-medium outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Availability text */}
      {avail === "free" && (
        <div className="text-sm text-[#1a73e8] mb-5">name available</div>
      )}
      {avail === "taken" && (
        <div className="text-sm text-red-500 mb-5">name taken</div>
      )}
      {!avail && (
        <div className="text-sm text-gray-400 mb-5">type to check availability</div>
      )}

      {/* Go live button */}
      <button
        onClick={onPublish}
        disabled={busy || !slug || avail === "taken"}
        className="mt-2 w-full h-12 rounded-full bg-black text-white text-lg font-semibold disabled:opacity-50"
      >
        go live
      </button>

      {/* Show link after publish */}
      {liveUrl && (
        <div className="mt-5 text-sm text-[#191919]">
          your site is live on{" "}
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="underline text-[#1a73e8]"
          >
            {liveUrl}
          </a>
        </div>
      )}
    </div>
  </Overlay>
);

};

/* =========================
   MAIN APP
   ========================= */
function SurfersApp() {
  const [view, setView] = useState("home");

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const [images, setImages] = useState([]);
  const [figmas, setFigmas] = useState([]);
  const [showAttach, setShowAttach] = useState(false);

  const [user, setUser] = useState(null);

  const [messages, setMessages] = useState([]); // {id, role, content}
  const [chatInput, setChatInput] = useState("");

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

  const [previews, setPreviews] = useState({});
  const [published, setPublished] = useState({});

  const [liveSlug, setLiveSlug] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveAvail, setLiveAvail] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [liveResultUrl, setLiveResultUrl] = useState("");

  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const attachRef = useRef(null);
  const fileInputRef = useRef(null);

  const chatFormRef = useRef(null);
  const chatTextareaRef = useRef(null);
  const chatAttachRef = useRef(null);
  const chatFileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
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

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      if (!pendingPrompt && view === "auth") setView("home");
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
      clearConversationState();
      setView("home");
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

  const onFilesPickedChat = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f), name: f.name }));
    setChatImages((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

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
      setView("auth");
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
      setView("auth");
      return;
    }

    setChatInput("");
    setChatImages([]);
    setChatFigmas([]);
    setTimeout(() => sendMessageStream(txt, imgs), 0);
  };

  const getMsgById = (id) => messages.find((m) => m.id === id);

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

  const stripFenced = (t) => (t || "").replace(/```[\s\S]*?```/g, "");
  const stripHtmlDoc = (t) =>
    (t || "").replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, "").replace(/<html[\s\S]*?<\/html>/gi, "");
  const stripIndexHtmlMention = (t) =>
    (t || "").replace(/^\s*index\.html\s*:?\s*$/gim, "");
  const stripGeneratedCodeFromChat = (t) =>
    stripIndexHtmlMention(stripHtmlDoc(stripFenced(t)));

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
      setLiveResultUrl(liveAbs);
      setModal((m) => ({ ...m, note: "Live!" }));
      setLiveBusy(false);
    } catch (err) {
      setModal((m) => ({ ...m, note: `Publish failed: ${String(err)}` }));
      setLiveBusy(false);
    }
  };

  const checkAvailability = async (slugVal) => {
  const slug = (slugVal || liveSlug || "")
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
    const res = await fetch(`${API_URL}/live/${slug}/`, { method: "HEAD" });
    setLiveAvail(res.ok ? "taken" : "free");
  } catch {
    setLiveAvail(null);
  }
};


  const copySlugFull = async () => {
    const full = `${liveSlug}${SUBDOMAIN_SUFFIX}`;
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
          className="fixed inset-0 z-0 "
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
              <h1 className=" text-white font-bold font-wixmadefor leading-[0.8]
                       text-[55px] sm:text-[56px] md:text-[70px]">
                surfers<br/> codes for you.<br className="sm:block" />yeah.
              </h1>

              <div className="mt-14 flex justify-center">
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
                    onClick={() => setView("auth")}
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
          <div className="absolute inset-0  pointer-events-none" />

          <Container className="flex flex-col items-center justify-center min-h-[72vh]">
            <LogoLarge className="h-[100px] w-[95px] mb-5" />
            <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-[560px] mx-auto">
              <div
                className="relative bg-[#FFFFFF] border-[#2A2A2A] rounded-[32px]
               px-[25px] pt-[15px] pb-[65px]
               shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
              >
                {!prompt && (
                  <div
                    className="pointer-events-none absolute left-[25px] right-[25px] top-32px]
                   text-[18px] leading-[20px] text-[#191919] select-none"
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
                  className="prompt-textarea w-full bg-transparent outline-none text-[18px]  leading-[20px]
                 text-[#191919] resize-none break-all"
                  style={{
                    maxHeight: `${MAX_TA_HEIGHT}px`,
                    overflowY: 'auto',
                    overflowWrap: 'anywhere',
                  }}
                  placeholder={prompt ? undefined : ''}
                />

                <div className="absolute left-[18px] right-[18px] bottom-[12px] flex items-center justify-between">
                  <div className="relative" ref={attachRef}>
                    <button
                      type="button"
                      aria-label="attach file"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#212121] text-[28px] leading-none transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="submit"
                    aria-label="send"
                    disabled={loading}
                    className={`h-[32px] w-[32px] rounded-full text-[#FFFFFF] ${
                      loading ? "bg-[#2A2A2B] text-[#9AA0A6]" : "bg-[#1A1A1B] hover:bg-[#232325] text-[#0E0E0E]"
                    } flex text-[24px] items-center justify-center transition-colors`}
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
                accept=".txt,.pdf,.doc,.docx,.md,.json,.js,.ts,.html,.css,.jsx,.tsx,.py,.java,.c,.cpp,.cs, .pmg, .jpg, .jpeg, .mp3, .mp4, .gif"
                multiple
                className="hidden"
                onChange={onFilesPicked}
              />
            </form>
          </Container>
        </main>
      )}

      {/* ===== AUTH ===== */}
      {view === "auth" && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-0 "
            style={{
              backgroundImage: "url('/background.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="fixed inset-0 z-0 bg-black/50 " aria-hidden="true" />

          <header className="pt-4 ">
            <Container>
              <div className="relative h-[28px] flex items-center mb-12">
                <button
                  onClick={() => setView("home")}
                  aria-label="back"
                  className="fixed top-5 left-[20vw] lg:left-[20vw] z-10"
                >
                  <img src="/back.png" alt="back" className="h-4 w-4 rotate-315" />
                </button>
              </div>
            </Container>
          </header>

          <main className="relative z-10 lex fitems-center justify-center">
            <main className="flex-1">
              <Container className="min-h-[70vh] flex flex-col items-center justify-center text-center leading-[0.8]">
                <h1 className="text-[#FFFFFF] text-[28px] sm:text[34px] font-bold mb-1">
                  account?
                </h1>
                <div className="text-[#FFFFFF] text-[48px] sm:text-[58px] font-bold mt-0.5 mb-2">
                  create.<br/> </div>
                <div className="text-[#FFFFFF] text-[65px] sm:text-[78px] font-bold mt-0.5 mb-7">
                  log in.
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="mt-6.5 h-10.5 px-20 rounded-full bg-white text-[16.5px] font-[500] text-[#484848] inline-flex items-center gap-3"
                >
                  <img
                    src="/google.png"
                    alt="Google"
                    className="h-5 w-5"
                  />
                  continue with Google
                </button>

                <div className="mt-3 text-sm text-[#C7C7C7]">
                  issues logging in? <span className="cursor-pointer text-[#FFFFFF]">mail us</span>
                </div>
              </Container>
            </main>
          </main>
        </>
      )}

      {/* ===== CHAT PAGE ===== */}
      {view === "chat" && (
        <>
          {/* FIXED back arrow — same asset as Auth. Responsive left offset: 5vw on small/med, 20vw on large+ */}
          <button
            onClick={() => { stopStreaming(); setView("home"); }}
            aria-label="back"
            className="fixed top-5 left-[5vw] lg:left-[20vw] z-50"
          >
            <img src="/back.png" alt="back" className="h-4 w-4 rotate-315" />
          </button>

          {/* No logo or profile icon in chat header per request */}
          <header className="pt-4 bg-[#0E0E0E]">
            <Container>
              <div className="h-[8px]" />
            </Container>
          </header>

          <main className="flex-1 bg-[#0E0E0E]">
            {/* Chat OUTPUT rail (5vw / 20vw margins). Prompt box is NOT inside this. */}
            <Rail className="pt-8 pb-40">
              {messages.map((m) => {
                const isAssistant = m.role === "assistant";
                const hasContent = (m.content ?? "").trim() !== "";
                const cleaned = isAssistant
                  ? stripGeneratedCodeFromChat(m.content || "")
                  : m.content || "";
                const textToShow =
                  (cleaned || "").trim() ||
                  (isAssistant ? "_generated code ready — use the buttons below._" : "");

                // show message + 3 buttons ONLY if this assistant message actually contains code
                const hasCodeForMsg = isAssistant && outputHasActualCode(m.content || "");
                
                const canShowInline = hasCodeForMsg && !isStreaming;

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
                      className={`max-w-[560px] items-center rounded-2xl px-5.5 py-3
                        mb-3.5 leading-6 ${
                        isAssistant ? "bg-transparent text-[#FFFFFF]" : "bg-[#171717] text-[#FFFFFF]"
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

                            {/* The line + 3 buttons — appear ONLY when code exists, and align with prompt box (max-w 560). */}
                            {canShowInline && (
                              
                              <div className=" max-w-auto mx-auto items-center justify-center text-center mt-4">
  <p className="text-[16px] font-regular mt-10 leading-5 text-[#FFFFFF] mb-3">
   

    See the code, view to see the site or go live or ask surfers for anything.
  </p>
  <div className="flex gap-3">
    <button
      type="button"
      onClick={() => openCodeModal(m.id)}
      className="flex-1 h-10 rounded-full font-medium bg-[#FFFFFF] text-[#2E2E2E]"
    >
      code
    </button>
    <button
      type="button"
      onClick={() => openViewModal(m.id)}
      className="flex-1 h-10 rounded-full font-medium bg-[#FFFFFF] text-[#2E2E2E]"
    >
      view
    </button>
    <button
      type="button"
      onClick={() => openLiveModal(m.id)}
      className="flex-1 h-10 rounded-full font-medium bg-[#FFFFFF] text-[#2E2E2E]"
    >
      go live
    </button>
  </div>
</div>

                            )}
                          </>
                        ) : isStreaming ? (
                          <div
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full  text-[#FFFFFF] text-[15.5px]"
                            aria-live="polite"
                          >
                            <Spinner />
                            <span>{phase === "coding" ? "Thinking.." : "Thinking"}</span>
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
            </Rail>
          </main>

          {/* Chat PROMPT — exact copy of Home prompt box. Not inside Rail. */}
          <div className="fixed left-0 right-0 bottom-0  from-[#0B0B0C] via-[#0B0B0C]/90 to-transparent pt-6 pb-6 bg-[#0E0E0E]">
            <Container>
             <form ref={chatFormRef} onSubmit={sendFromChat} className="w-full max-w-[560px] mx-auto">

                <div
                  className="relative ] border-[#4E4E4E] border-[1px] rounded-[32px] prompt-textarea
                             px-[25px] pt-[15px] pb-[65px]
                             shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
                >
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
                    placeholder="idea? let's build that"
                    className="w-full prompt-textchatarea outline-none text-[18px] leading-[20px] text-[#FFFFFF] resize-none break-all"
                   style={{ maxHeight: `${MAX_TA_HEIGHT}px`, overflowY: "hidden", overflowWrap: "anywhere" }}
             
                />


                  
                  <div className="absolute left-[18px] right-[18px] bottom-[12px] flex items-center justify-between">
                    {/* Plain attach from PC (no figma/images menu) */}
                    <button
                      type="button"
                      aria-label="attach file"
                      onClick={() => chatFileInputRef.current?.click()}
                      className="text-[#FFFFFF] text-[28px] leading-none transition-colors"
                    >
                      +
                    </button>

                    <button
                      type="submit"
                      className="h-[32px] w-[32px] rounded-full bg-[#FFFFFF] hover:bg-[#FFFFFF] text-[#0E0E0E] flex items-center justify-center transition-colors text-[24px]"
                      aria-label="send"
                    >
                      ↑
                    </button>
                  </div>

                  <input
                    ref={chatFileInputRef}
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.md,.json,.js,.ts,.html,.css,.jsx,.tsx,.py,.java,.c,.cpp,.cs, .pmg, .jpg, .jpeg, .mp3, .mp4, .gif"
                    multiple
                    className="hidden"
                    onChange={onFilesPickedChat}
                  />
                </div>
              </form>
            </Container>
          </div>
        </>
      )}

      {/* ===== FOOTER ===== */}
      {view === "home" && (
        <footer className="relative z-10 pb-[22px]">
          <Container>
            <p className="mx-auto text-center text-[14.5px] font-[400] leading-[20px] text-[#FFFFFF] font-wixmadefor">
              ideas live in seconds. surfers codes anything for you. surfers © 2025.
            </p>
          </Container>
        </footer>
      )}

      {/* ===== MODALS ===== */}
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
  avail={liveAvail}
  liveUrl={liveResultUrl}
  checkAvailability={checkAvailability}
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
