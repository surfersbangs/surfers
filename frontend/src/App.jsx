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

/**********************
 * Icons / Logos
 **********************/
const LogoSmall = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#2BA6FF" />
    <path d="M18 35c4 6 10 9 14 9s10-3 14-9c-4 3-9 5-14 5s-10-2-14-5z" fill="#fff" />
    <path d="M23 25c2 2 4 3 9 3s7-1 9-3c-2-4-6-7-9-7s-7 3-9 7z" fill="#0E1111" />
  </svg>
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

/* icons for go-live modal */
const CopyIcon = ({ active }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" stroke={active ? "#1a73e8" : "#9AA0A6"} strokeWidth="1.6"/>
    <rect x="4" y="4" width="11" height="11" rx="2" stroke={active ? "#1a73e8" : "#9AA0A6"} strokeWidth="1.6" opacity="0.7"/>
  </svg>
);
const ExtLinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M14 5h5v5" stroke="#9AA0A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 14L19 5" stroke="#9AA0A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" stroke="#9AA0A6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**********************
 * Modal
 **********************/
const Modal = ({ open, onClose, title, rightEl, children }) => {
  // lock body scroll while modal is open (no visible design change)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="relative w-[min(980px,94vw)] h-[min(82vh,760px)] rounded-2xl border border-[#2A2A2A] bg-[#0B0B0C] p-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-[#121214] text-[#EDEDED] hover:bg-[#1A1A1B]"
          aria-label="close"
        >
          ×
        </button>
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-lg text-[#EDEDED]">{title}</h3>}
          {rightEl || null}
        </div>
        <div className="w-full h-[calc(100%-40px)] overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#111214]">
          {children}
        </div>
      </div>
    </div>
  );
};

/**********************
 * Markdown with safe code highlight
 **********************/
function CodeBlock({ inline, className, children, ...props }) {
  const codeRef = useRef(null);
  const raw = Array.isArray(children) ? children.join("") : (children ?? "");
  const lang = (className || "").replace("language-", "").trim();

  useEffect(() => {
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
  }, [raw, lang]);

  if (inline) {
    return (
      <code
        className={`px-1.5 py-0.5 rounded bg-[#151517] border border-[#2A2A2A] ${className || ""}`}
        {...props}
      >
        {raw}
      </code>
    );
  }
  return (
    <pre className="mb-3 rounded-[12px] bg-[#0f0f10] border border-[#2A2A2A] overflow-x-auto">
      <code ref={codeRef} className={`block p-3 ${className || ""}`} />
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

/**********************
 * STREAM CONSTANTS
 **********************/
const STREAM_INACTIVITY_MS = 25000;
const STREAM_MAX_DURATION_MS = 180000;
const VERSION_TAG = "app-parse+stream v2.4";

/**********************
 * ROBUST CODE PARSERS
 **********************/
const FENCE_GLOBAL_RE = /```(\w+)?\n([\s\S]*?)```/g;
const INLINE_LANG_LINE_RE = /^\s*(html?|css|js|javascript|typescript)\s*:?\s*$/i;

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
    if (INLINE_LANG_LINE_RE.test(line)) {
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
    (b) =>
      b.lang === "js" ||
      b.lang === "javascript" ||
      b.lang === "ts" ||
      b.lang === "typescript"
  );

  const htmlFrag = findHtmlFragment(text);
  if (htmlFrag) {
    const css = fencedCss.map((b) => b.code).join("\n\n").trim();
    const js = fencedJs.map((b) => b.code).join("\n\n").trim();
    const merged = assembleHtml({
      html: htmlFrag,
      css: css || null,
      js: js || null,
    });
    return { lang: "html", code: merged, source: "html-fragment+merge" };
  }

  const sections = splitByHeadings(text);
  if (sections.html || sections.css || sections.js) {
    const merged = assembleHtml({
      html: sections.html || null,
      css: sections.css || null,
      js:
        sections.js ||
        sections.javascript ||
        sections.ts ||
        sections.typescript ||
        null,
    });
    return { lang: "html", code: merged, source: "headings-merge" };
  }

  if (fenced.length) {
    const htmlLongest =
      fencedHtml.sort((a, b) => b.code.length - a.code.length)[0]?.code || null;
    const cssMerged = fencedCss.map((b) => b.code).join("\n\n").trim() || null;
    const jsMerged = fencedJs.map((b) => b.code).join("\n\n").trim() || null;
    const merged = assembleHtml({
      html: htmlLongest,
      css: cssMerged,
      js: jsMerged,
    });
    return {
      lang: "html",
      code: merged,
      source: htmlLongest ? "fenced-html-merge" : "fenced-scaffold",
    };
  }

  const maybeTagIdx = text.search(
    /<(!DOCTYPE|html|head|body|canvas|div|section|main|script|style)\b/i
  );
  if (maybeTagIdx !== -1) {
    const tail = text.slice(maybeTagIdx).trim();
    return { lang: "html", code: tail, source: "html-tail" };
  }

  const js = text.trim();
  const html = assembleHtml({ js });
  return { lang: "html", code: html, source: "fallback-js-scaffold" };
}

/**********************
 * Helpers
 **********************/
const sanitizeSlugClient = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "proj";

/**********************
 * MAIN APP
 **********************/
function SurfersApp() {
  // ---- View routing ----
  const [view, setView] = useState("home");

  // ---- Prompt state (home) ----
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  // attachments (home)
  const [images, setImages] = useState([]); // {file, url, name}
  const [figmas, setFigmas] = useState([]);
  const [showAttach, setShowAttach] = useState(false);

  // ---- Auth state ----
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Phone OTP states
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  // ---- Chat state ----
  const [messages, setMessages] = useState([]); // {id, role, content}
  const [chatInput, setChatInput] = useState("");

  // streaming control
  const [isStreaming, setIsStreaming] = useState(false);
  const [phase, setPhase] = useState(null);
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

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
    }, 33);
  };

  const prevUidRef = useRef(null);

  // chat attachments
  const [chatImages, setChatImages] = useState([]); // {file, url, name}
  const [chatFigmas, setChatFigmas] = useState([]);
  const [showChatAttach, setShowChatAttach] = useState(false);

  const chatEndRef = useRef(null);

  // pending (store what a logged-out user tried to send)
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingImages, setPendingImages] = useState([]);

  // action modals
  const [modal, setModal] = useState({
    type: null,
    msgId: null,
    code: "",
    lang: "",
    url: "",
    note: "",
  });

  // ===== preview + publish state =====
  const [previews, setPreviews] = useState({});
  const [published, setPublished] = useState({});
  const [previewStatus, setPreviewStatus] = useState("idle"); // idle | building | ready | error

  // ---- Go Live modal local state (NEW, design unchanged) ----
  const [liveSlug, setLiveSlug] = useState("");
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [livePublishing, setLivePublishing] = useState(false);
  const [liveResultUrl, setLiveResultUrl] = useState("");

  // refs (home)
  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const attachRef = useRef(null);
  const fileInputRef = useRef(null);

  // refs (chat)
  const chatFormRef = useRef(null);
  const chatTextareaRef = useRef(null);
  const chatAttachRef = useRef(null);
  const chatFileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // normalize backend-relative links
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

  // ---- Typewriter placeholder (home) ----
  const TW_PREFIX = "surfers builds ";
  const TW_LIST = ["games for you", "websites for you", "apps for you", "anything for you"];
  const [twIdx, setTwIdx] = useState(0);
  const [twSub, setTwSub] = useState(0);
  const [twDeleting, setTwDeleting] = useState(false);
  const [blink, setBlink] = useState(true);
  const typewriter = TW_PREFIX + TW_LIST[twIdx].slice(0, twSub) + (blink ? " |" : "  ");

  // caret blink
  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(t);
  }, []);

  // typing/deleting loop (paused when user is typing)
  useEffect(() => {
    if (prompt) return;
    const full = TW_LIST[twIdx];
    const typingDelay = 150;
    const deletingDelay = 25;
    const holdAtEnd = 450;
    const holdAtStart = 120;

    let timer;
    if (!twDeleting) {
      if (twSub < full.length) {
        timer = setTimeout(() => setTwSub(twSub + 1), typingDelay);
      } else {
        timer = setTimeout(() => setTwDeleting(true), holdAtEnd);
      }
    } else {
      if (twSub > 0) {
        timer = setTimeout(() => setTwSub(twSub - 1), deletingDelay);
      } else {
        timer = setTimeout(() => {
          setTwDeleting(false);
          setTwIdx((twIdx + 1) % TW_LIST.length);
        }, holdAtStart);
      }
    }
    return () => clearTimeout(timer);
  }, [prompt, twIdx, twSub, twDeleting]);

  // observe bottom visibility (future "jump to latest")
  useEffect(() => {
    if (!chatEndRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nearBottom = entry.isIntersecting;
        atBottomRef.current = nearBottom;
        setShowJump(!nearBottom);
      },
      { root: null, threshold: 0.01, rootMargin: "0px 0px -96px 0px" }
    );
    observer.observe(chatEndRef.current);
    return () => observer.disconnect();
  }, []);

  // auth changes → clear cross-account state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      const newUid = currentUser?.uid || null;
      const prevUid = prevUidRef.current;
      if (newUid !== prevUid) {
        clearConversationState();
      }
      setUser(currentUser);
      prevUidRef.current = newUid;
    });
    return () => unsub();
  }, []);

  // after login, auto-send pending
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

  // cleanup on unmount
  useEffect(() => () => stopStreaming(), []);

  // stop streaming when leaving chat
  useEffect(() => {
    if (view === "home") stopStreaming();
  }, [view]);

  // receive messages from preview iframe (ready/error)
  useEffect(() => {
    const onMsg = (e) => {
      const d = e?.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "surfers:ready") setPreviewStatus("ready");
      if (d.type === "surfers:error") setPreviewStatus("error");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const resetPhoneAuth = () => {
    setPhone(""); setOtp(""); setOtpSent(false); setConfirmation(null);
    try {
      if (typeof window !== "undefined" && window.recaptchaVerifier) {
        window.recaptchaVerifier.clear?.();
        window.recaptchaVerifier = null;
      }
    } catch {}
  };

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); resetPhoneAuth(); setAuthOpen(false); }
    catch (err) { console.error(err); }
  };
  const handleLogout = async () => {
    try { await signOut(auth); }
    catch (err) { console.error(err); }
    finally {
      resetPhoneAuth();
      setAuthOpen(false);
      clearConversationState();
      setView("home");
    }
  };

  const sendOtp = async () => {
    try {
      if (typeof window !== "undefined" && !window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      }
      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmation(confirmationResult); setOtpSent(true);
    } catch (err) {
      console.error("OTP error:", err); alert("Failed to send OTP. Format: +91xxxxxxxxxx");
    }
  };
  const verifyOtp = async () => {
    try { if (confirmation) { await confirmation.confirm(otp); resetPhoneAuth(); setAuthOpen(false); } }
    catch (err) { console.error("OTP verify error:", err); alert("Invalid OTP"); }
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TA_HEIGHT);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > MAX_TA_HEIGHT ? "auto" : "hidden";
  };
  useEffect(() => { resizeTextarea(); }, [prompt]);

  const resizeChatTextarea = () => {
    const el = chatTextareaRef.current; if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TA_HEIGHT);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > MAX_TA_HEIGHT ? "auto" : "hidden";
  };
  useEffect(() => { resizeChatTextarea(); }, [chatInput]);

  // type anywhere to focus active input
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

  // auto focus chat box when entering chat view
  useEffect(() => { if (view === "chat") chatTextareaRef.current?.focus(); }, [view]);

  // popover toggles
  useEffect(() => {
    if (!showAttach) return;
    const onClick = (e) => { if (attachRef.current && !attachRef.current.contains(e.target)) setShowAttach(false); };
    const onEsc = (e) => { if (e.key === "Escape") setShowAttach(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onEsc); };
  }, [showAttach]);
  useEffect(() => {
    if (!showChatAttach) return;
    const onClick = (e) => { if (chatAttachRef.current && !chatAttachRef.current.contains(e.target)) setShowChatAttach(false); };
    const onEsc = (e) => { if (e.key === "Escape") setShowChatAttach(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onEsc); };
  }, [showChatAttach]);

  // file pickers
  const onAddImageClick = () => { fileInputRef.current?.click(); setShowAttach(false); };
  const onFilesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f), name: f.name }));
    setImages((prev) => [...prev, ...previews]);
    e.target.value = "";
  };
  const onAddFigmaClick = () => {
    const url = window.prompt("Paste Figma link:"); if (!url) return;
    const ok = /figma\.com\/(file|design)\//i.test(url);
    if (!ok) { alert("That doesn't look like a Figma file link."); return; }
    setFigmas((prev) => [...prev, url]); setShowAttach(false);
  };
  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const removeFigma = (i) => setFigmas((prev) => prev.filter((_, idx) => idx !== i));

  const onAddImageClickChat = () => { chatFileInputRef.current?.click(); setShowChatAttach(false); };
  const onFilesPickedChat = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => ({ file: f, url: URL.createObjectURL(f), name: f.name }));
    setChatImages((prev) => [...prev, ...previews]);
    e.target.value = "";
  };
  const onAddFigmaClickChat = () => {
    const url = window.prompt("Paste Figma link:"); if (!url) return;
    const ok = /figma\.com\/(file|design)\//i.test(url);
    if (!ok) { alert("That doesn't look like a Figma file link."); return; }
    setChatFigmas((prev) => [...prev, url]); setShowChatAttach(false);
  };
  const removeChatImage = (i) => setChatImages((prev) => prev.filter((_, idx) => idx !== i));
  const removeChatFigma = (i) => setChatFigmas((prev) => prev.filter((_, idx) => idx !== i));

  // helpers
  const addAssistantPlaceholder = () => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, role: "assistant", content: "", streaming: true }]);
    return id;
  };

  const appendToAssistant = (id, chunk) => {
    setMessages(prev => prev.map(m =>
      m.id === id
        ? {
            ...m,
            content: (m.content || "") + (chunk || ""),
            className: "transition-all duration-200"
          }
        : m
    ));
  };
  const scrollMessageToTop = (msgId) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const stopStreaming = (reason = "manual-stop") => {
    try { streamAbortRef.current?.abort?.(reason); } catch {}
    streamAbortRef.current = null;
    setIsStreaming(false);
    setPhase(null);
  };

  // wipe all UI/chat state
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
  };

  // non-stream fallback (HOME only)
  async function sendMessage(text) {
    const id = Date.now();
    setMessages((prev) => [...prev, { id, role: "user", content: text }]);
    try {
      const formData = new FormData();
      formData.append("prompt", text);
      formData.append("history", JSON.stringify(messages.slice(-8)));
      images.forEach((img) => formData.append("images", img.file, img.name));

      const res = await fetch(`${API_URL}/api/generate`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || data.code || "";
      setMessages((prev) => [...prev, { id: id + 1, role: "assistant", content: reply || "…" }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: id + 1, role: "assistant", content: `// Error: ${String(err)}` }]);
    }
  }

  // STREAMING (raw/SSE/NDJSON)
  async function sendMessageStream(text, attachments = []) {
    const userId = Date.now();
    setMessages((prev) => [...prev, { id: userId, role: "user", content: text }]);
    const asstId = addAssistantPlaceholder();
    setPhase("connecting");
    streamBufRef.current.buf = "";
    if (streamBufRef.current.t) { clearTimeout(streamBufRef.current.t); streamBufRef.current.t = null; }

    scrollMessageToTop(userId);

    const hist = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    const formData = new FormData();
    formData.append("prompt", text);
    formData.append("history", JSON.stringify(hist));
    attachments.forEach((img) => { if (img?.file) formData.append("images", img.file, img.name || "image.png"); });

    const ac = new AbortController();
    streamAbortRef.current = ac;

    let idleTimer = null;
    let hardCapTimer = null;
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
      idleTimer = null; hardCapTimer = null;
    };

    let gotAny = false;

    try {
      setIsStreaming(true);
      armTimers();

      const res = await fetch(`${API_URL}/api/stream-es`, { method: "POST", body: formData, signal: ac.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body (streaming)");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // generic ingestor (supports raw/SSE/NDJSON) — simplified here (raw)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        if (chunkStr) {
          streamBufRef.current.buf += chunkStr;
          scheduleFlush(asstId);
          if (/\S/.test(chunkStr)) gotAny = true;
          if (/```|\b(import|class|def|function|const|let|var)\b/.test(chunkStr)) setPhase("coding");
          else if (!gotAny) setPhase("generating");
        }
        armTimers();
      }

      flushNow(asstId);
    } catch (err) {
      const msg = String(err?.name || err || "");
      const reason = (err && "message" in err) ? String(err.message) : msg;
      if (!/AbortError/i.test(msg) && !/AbortError/i.test(reason) && !/manual-stop|user-typed|new-message|stream-timeout|idle-timeout|max-duration/.test(reason)) {
        appendToAssistant(asstId, `\n// stream error: ${String(err)}`);
      }
    } finally {
      clearTimers();
      if (streamAbortRef.current === ac) streamAbortRef.current = null;
      if (!gotAny) appendToAssistant(asstId, "\n// (no content received — check server logs or network)");
      setPhase(null);
      setIsStreaming(false);
    }
  }

  // HOME SUBMIT — clear input BEFORE sending
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

  // CHAT SEND — clear input BEFORE sending
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

  // ===== helpers for “code / view / go live” =====
  const getMsgById = (id) => messages.find((m) => m.id === id);

  // first fenced code block extractor
  const extractFirstCodeBlock = (text) => {
    const m = (text || "").match(/```(\w+)?\n([\s\S]*?)```/);
    if (!m) return { lang: "", code: "" };
    return { lang: (m[1] || "").toLowerCase(), code: m[2] || "" };
  };

  // hide fenced code blocks and full html docs from the chat bubble,
  // plus hide lone "index.html" mention lines (per your rule)
  const stripFenced = (t) => (t || "").replace(/```[\s\S]*?```/g, "");
  const stripHtmlDoc = (t) =>
    (t || "")
      .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, "")
      .replace(/<html[\s\S]*?<\/html>/gi, "");
  const stripIndexHtmlMention = (t) =>
    (t || "").replace(/^\s*index\.html\s*:?\s*$/gim, "");
  const stripGeneratedCodeFromChat = (t) =>
    stripIndexHtmlMention(stripHtmlDoc(stripFenced(t)));

  // ===== preview build =====
  async function buildOrUpdatePreview(msgId) {
    const msg = getMsgById(msgId);
    const fullText = msg?.content || "";
    const parsed = parseGeneratedCode(fullText);
    if (!parsed.code || !parsed.code.trim()) {
      setPreviewStatus("error");
      setModal((m) => ({ ...m, note: "No usable code found in this message." }));
      return;
    }
    setPreviewStatus("building");

    const existing = previews[msgId];
    const payload = { code: parsed.code, lang: parsed.lang || "html", artifactId: existing?.artifactId || null };

    try {
      const res = await fetch(`${API_URL}/api/preview/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setPreviewStatus("error");
        setModal((m) => ({ ...m, note: `build failed: ${txt || res.status}` }));
        return;
      }
      const data = await res.json();
      const absUrl = makeAbsoluteUrl(data.previewUrl);
      const next = { artifactId: data.artifactId, url: absUrl };
      setPreviews((p) => ({ ...p, [msgId]: next }));

      const src = `${next.url}${next.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      setModal((m) => ({ ...m, url: src, note: "" }));
    } catch (err) {
      setPreviewStatus("error");
      setModal((m) => ({ ...m, note: `build failed: ${String(err)}` }));
    }
  }

  const openCodeModal = (id) => {
    const msg = getMsgById(id);
    const fullText = msg?.content || "";
    const parsed = parseGeneratedCode(fullText);
    setModal({
      type: "code",
      msgId: id,
      code: parsed.code || "",
      lang: parsed.lang || "html",
      url: "",
      note: parsed.code ? "" : "No usable code found in this message.",
    });
  };

  const openViewModal = async (id) => {
    const msg = getMsgById(id);
    const fullText = msg?.content || "";
    const parsed = parseGeneratedCode(fullText);
    setModal({ type: "view", msgId: id, code: parsed.code || "", lang: parsed.lang || "html", url: "", note: "" });
    await buildOrUpdatePreview(id);
  };

  // === Go live ===
  const copySlugToClipboard = async () => {
    const full = `${sanitizeSlugClient(liveSlug)}.surfers.co.in`;
    try {
      await navigator.clipboard?.writeText(full);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 1200);
    } catch {}
  };

  const openLiveModal = async (id) => {
    const prev = previews[id];
    if (!prev?.artifactId) {
      alert("Preview not built yet. Building now…");
      await openViewModal(id);
      return;
    }
    const defaultSlugBase = (user?.uid || "anon").slice(0, 6);
    const defaultSlug = `proj-${defaultSlugBase}-${String(id).slice(-4)}`;
    setLiveSlug(defaultSlug);
    setLivePublishing(false);
    setLiveResultUrl("");
    setCopiedSlug(false);
    setModal({ type: "live", msgId: id, code: "", lang: "", url: "", note: "" });
  };

  const publishLive = async () => {
    if (!modal.msgId) return;
    const prev = previews[modal.msgId];
    if (!prev?.artifactId) {
      setModal((m) => ({ ...m, note: "Preview not available. Build a preview first." }));
      return;
    }
    const slug = sanitizeSlugClient(liveSlug);
    if (!slug) {
      setModal((m) => ({ ...m, note: "Invalid project name." }));
      return;
    }
    try {
      setLivePublishing(true);
      setModal((m) => ({ ...m, note: "" }));
      const res = await fetch(`${API_URL}/api/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: slug, artifactId: prev.artifactId }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setModal((m) => ({ ...m, note: `Publish failed: ${t || res.status}` }));
        setLivePublishing(false);
        return;
      }
      const data = await res.json(); // { liveUrl, project, artifactId }
      const liveAbs = makeAbsoluteUrl(data.liveUrl);
      setPublished((p) => ({ ...p, [data.project]: data.artifactId }));
      setLiveResultUrl(liveAbs); // show the link below the button
      setModal((m) => ({ ...m, note: "Live! Share this URL. Re-run publish with the same slug to update." }));
    } catch (err) {
      setModal((m) => ({ ...m, note: `Publish failed: ${String(err)}` }));
    } finally {
      setLivePublishing(false);
    }
  };

  const closeModal = () => {
    setModal({ type: null, msgId: null, code: "", lang: "", url: "", note: "" });
    setPreviewStatus("idle");
    setLivePublishing(false);
    setLiveResultUrl("");
    setCopiedSlug(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#EDEDED] font-wix flex flex-col">
      {/* ===== TOP BAR (home) ===== */}
      {view === "home" && (
        <header className="pt-4">
          <Container>
            <div className="relative h-[28px] flex items-center">
              <LogoSmall className="h-[18px] w-[18px]" />
              <nav className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex gap-[36px] text-[14px] leading-[20px] text-[#D1D5DB]">
                <a href="#" className="hover:text-[#A8ADB5]">community</a>
                <a href="#" className="hover:text-[#A8ADB5]">developers</a>
              </nav>
              <div className="ml-auto cursor-pointer" onClick={() => { resetPhoneAuth(); setAuthOpen(true); }}>
                <ProfileIcon className="h-[20px] w-[20px]" />
              </div>
            </div>
          </Container>
        </header>
      )}

      {/* ===== HOME ===== */}
      {view === "home" && (
        <main className="flex-1">
          <Container className="flex flex-col items-center justify-center min-h-[72vh]">
            <LogoLarge className="h-[88px] w-[88px] mb-6" />
            <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-[560px] mx-auto">
              <div className="relative bg-[#121214] border-[0.5px] border-[#2A2A2A] rounded-[28px] px-[18px] pt-[12px] pb-[40px] shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                {(images.length > 0 || figmas.length > 0) && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div key={`img-${i}`} className="relative h-[68px] w-[88px] rounded-[10px] overflow-hidden border border-[#2A2A2A]">
                        <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[12px] flex items-center justify-center">×</button>
                      </div>
                    ))}
                    {figmas.map((url, i) => (
                      <div key={`fig-${i}`} className="group flex items-center gap-2 px-3 py-2 rounded-[10px] border border-[#2A2A2A] text-[#C8CCD2]" title={url}>
                        <FigmaIcon />
                        <span className="max-w-[180px] truncate">{url}</span>
                        <button type="button" onClick={() => removeFigma(i)} className="ml-1 h-5 w-5 rounded-full bg-[#1B1B1C] hover:bg-[#222] text-white text-[12px] flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {!prompt && (
                  <div
                    className="pointer-events-none absolute left-[18px] right-[18px] top-[12px] text-[16px] leading-[20px] text-[#9AA0A6] select-none"
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
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); formRef.current?.requestSubmit(); } }}
                  className="w-full bg-transparent outline-none text-[14px] leading-[20px] placeholder:text-[#9AA0A6] text-[#EDEDED] resize-none"
                  style={{ maxHeight: `${MAX_TA_HEIGHT}px` }}
                />

                <div className="absolute left-[18px] right-[18px] bottom-[12px] flex items-center justify-between">
                  <div className="relative" ref={attachRef}>
                    <button type="button" aria-label="add" onClick={() => setShowAttach((v) => !v)} className="text-[#C8CCD2] text-[18px] leading-none hover:text-white transition-colors">+</button>
                    {showAttach && (
                      <div className="absolute -top-2 left-0 -translate-y-full w-[180px] rounded-[12px] bg-white text-black border border-neutral-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)] p-2">
                        <button type="button" onClick={onAddImageClick} className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100">
                          <ImageIcon /> <span className="text-[14px] text-neutral-800">add image</span>
                        </button>
                        <button type="button" onClick={onAddFigmaClick} className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100">
                          <FigmaIcon /> <span className="text-[14px] text-neutral-800">add figma</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="submit" aria-label="send" disabled={loading} className={`h-[28px] w-[28px] rounded-full ${loading ? "bg-[#2A2A2B] text-[#9AA0A6]" : "bg-[#1A1A1B] hover:bg-[#232325] text-[#DADDE2]"} flex items-center justify-center transition-colors`}>
                    {loading ? "…" : "↑"}
                  </button>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFilesPicked} />
            </form>

            {code ? (
              <div className="w-full max-w-[560px] mt-4">
                <pre className="whitespace-pre-wrap text-[12px] leading-5 text-[#C9D1D9] bg-[#111214] border border-[#2A2A2A] rounded-[12px] p-4 overflow-x-auto">
                  {code}
                </pre>
              </div>
            ) : null}
          </Container>
        </main>
      )}

      {/* ===== CHAT PAGE ===== */}
      {view === "chat" && (
        <>
          <header className="pt-4">
            <Container>
              <div className="relative h-[28px] flex items-center">
                <button onClick={() => { stopStreaming(); setPhase(null); setView("home"); }} className="mr-2">
                  <BackArrow className="h-[18px] w-[18px]" />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"><LogoSmall className="h-[18px] w-[18px]" /></div>
                <div className="ml-auto cursor-pointer" onClick={() => { resetPhoneAuth(); setAuthOpen(true); }}>
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

                const cleaned = isAssistant ? stripGeneratedCodeFromChat(m.content || "") : (m.content || "");
                const textToShow = (cleaned || "").trim() || (isAssistant ? "_generated code ready — use the buttons below._" : "");

                return (
                  <div id={`msg-${m.id}`} key={m.id} className={`mb-4 flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[720px] rounded-2xl px-4 py-3 leading-6 ${isAssistant ? "bg-transparent text-[#EDEDED]" : "bg-[#1A1A1B] text-[#EDEDED]"}`}
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {isAssistant ? (
                        hasContent ? (
                          <>
                            <Markdown>{textToShow}</Markdown>

                            {!isStreaming && (
                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => openCodeModal(m.id)}
                                  className="px-4 py-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1B] hover:bg-[#232325] text-[#EDEDED]"
                                >
                                  code
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openViewModal(m.id)}
                                  className="px-4 py-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1B] hover:bg-[#232325] text-[#EDEDED]"
                                >
                                  view
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openLiveModal(m.id)}
                                  className="px-4 py-2 rounded-full bg-[#EA3838] hover:bg-[#ff3d3d] text-white"
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
                            <span>
                              {phase === "thinking" ? "thinking…" : phase === "coding" ? "writing code…" : "writing…"}
                            </span>
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

          <div className="fixed left-0 right-0 bottom-0 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/90 to-transparent pt-6 pb-6">
            <Container>
              <form ref={chatFormRef} onSubmit={sendFromChat} className="w-full max-w-[560px] mx-auto">
                <div className="relative bg-[#121214] border-[0.5px] border-[#2A2A2A] rounded-[28px] px-[18px] pt-[12px] pb-[40px] shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                  {(chatImages.length > 0 || chatFigmas.length > 0) && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {chatImages.map((img, i) => (
                        <div key={`cimg-${i}`} className="relative h-[68px] w-[88px] rounded-[10px] overflow-hidden border border-[#2A2A2A]">
                          <img src={img.url || URL.createObjectURL(img.file)} alt={img.name} className="h-full w-full object-cover" />
                          <button type="button" onClick={() => removeChatImage(i)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[12px] flex items-center justify-center">×</button>
                        </div>
                      ))}
                      {chatFigmas.map((url, i) => (
                        <div key={`cfig-${i}`} className="group flex items-center gap-2 px-3 py-2 rounded-[10px] border border-[#2A2A2A] text-[#C8CCD2]" title={url}>
                          <FigmaIcon />
                          <span className="max-w-[180px] truncate">{url}</span>
                          <button type="button" onClick={() => removeChatFigma(i)} className="ml-1 h-5 w-5 rounded-full bg-[#1B1B1C] hover:bg-[#222] text-white text-[12px] flex items-center justify-center">×</button>
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
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chatFormRef.current?.requestSubmit(); } }}
                    placeholder="build anything fantastic."
                    className="w-full bg-transparent outline-none text-[16px] leading-[20px] placeholder:text-[#9AA0A6] text-[#EDEDED] resize-none"
                    style={{ maxHeight: `${MAX_TA_HEIGHT}px` }}
                  />

                  <div className="absolute left-[18px] right-[18px] bottom-[12px] flex items-center justify-between">
                    <div className="relative" ref={chatAttachRef}>
                      <button type="button" aria-label="add" onClick={() => setShowChatAttach((v) => !v)} className="text-[#C8CCD2] text-[18px] leading-none hover:text-white transition-colors">+</button>
                      {showChatAttach && (
                        <div className="absolute -top-2 left-0 -translate-y-full w-[180px] rounded-[12px] bg-white text-black border border-neutral-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)] p-2">
                          <button type="button" onClick={onAddImageClickChat} className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100">
                            <ImageIcon /> <span className="text-[14px] text-neutral-800">add image</span>
                          </button>
                          <button type="button" onClick={onAddFigmaClickChat} className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100">
                            <FigmaIcon /> <span className="text-[14px] text-neutral-800">add figma</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button type="submit" className="h-[28px] w-[28px] rounded-full bg-[#1A1A1B] hover:bg-[#232325] text-[#DADDE2] flex items-center justify-center transition-colors" aria-label="send">
                      ↑
                    </button>
                  </div>
                </div>

                <input ref={chatFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFilesPickedChat} />
              </form>
            </Container>
          </div>

          {/* ===== ACTION MODALS ===== */}
          <Modal open={modal.type === "code"} onClose={closeModal} title="Code">
            <div className="w-full h-full overflow-auto p-3">
              {modal.code
                ? <Markdown>{` \`\`\`${modal.lang || ""}\n${modal.code}\n\`\`\` `}</Markdown>
                : <div className="p-4 text-[#c7cbd2]">{modal.note}</div>
              }
            </div>
          </Modal>

          <Modal
            open={modal.type === "view"}
            onClose={closeModal}
            title="Preview"
            rightEl={
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${previewStatus === "ready" ? "border-green-700 text-green-400" : previewStatus === "building" ? "border-yellow-700 text-yellow-400" : previewStatus === "error" ? "border-red-700 text-red-400" : "border-[#2A2A2A] text-[#C8CCD2]"}`}>
                  {previewStatus === "ready" ? "● ready" : previewStatus === "building" ? "● building" : previewStatus === "error" ? "● error" : "● idle"}
                </span>
                <button
                  type="button"
                  onClick={() => buildOrUpdatePreview(modal.msgId)}
                  className="px-3 py-1.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1B] hover:bg-[#232325] text-sm"
                  title="Rebuild"
                >
                  update preview
                </button>
              </div>
            }
          >
            {modal.url
              ? (
                <iframe
                  key={modal.url}
                  src={modal.url}
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                  allow="accelerometer; camera; microphone; clipboard-read; clipboard-write; geolocation; gyroscope; payment; fullscreen"
                  referrerPolicy="no-referrer"
                  onLoad={() => setPreviewStatus("ready")}
                  onError={() => setPreviewStatus("error")}
                />
              )
              : <div className="p-4 text-[#c7cbd2]">{modal.note || "building preview…"}</div>
            }
          </Modal>

          {/* ===== GO LIVE MODAL (same design, now with copy + link after publish) ===== */}
          <Modal open={modal.type === "live"} onClose={closeModal} title="">
            <div className="w-full h-full overflow-auto flex items-center justify-center p-6">
              <div className="w-[min(680px,92%)] text-[#EDEDED]">
                {/* header (keep your style) */}
                <div className="text-center mb-6">
                  <div className="text-[44px] font-extrabold leading-none">
                    <span className="text-[#EDEDED]">go live.</span>{" "}
                    <span className="text-[#ff4747]">yeah.</span>
                  </div>
                </div>

                {/* slug input + copy (kept style) */}
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 flex items-center rounded-xl bg-white text-[#1b1b1b] overflow-hidden">
                    <input
                      value={liveSlug}
                      onChange={(e) => setLiveSlug(sanitizeSlugClient(e.target.value))}
                      className="flex-1 px-4 py-3 outline-none text-[16px]"
                      placeholder="project-name"
                    />
                    <div className="px-3 text-[16px] font-medium text-[#555] border-l border-neutral-200">
                      .surfers.co.in
                    </div>
                  </div>

                  <button
                    onClick={copySlugToClipboard}
                    className={`px-3 rounded-xl border ${copiedSlug ? "border-[#1a73e8] bg-[#1a73e8] text-white" : "border-[#2A2A2A] bg-[#1B1B1C] text-[#EDEDED]"} flex items-center justify-center`}
                    title="Copy full domain"
                  >
                    <CopyIcon active={copiedSlug} />
                  </button>
                </div>

                <div className="text-center mt-2">
                  <a className="text-[#4b9fff] underline cursor-pointer text-sm">
                    check the availability of domain
                  </a>
                </div>

                {/* publish button */}
                <div className="mt-5">
                  <button
                    disabled={livePublishing}
                    onClick={publishLive}
                    className={`w-full py-4 rounded-2xl text-white text-lg font-semibold ${livePublishing ? "bg-[#b83a3a] cursor-not-allowed" : "bg-[#EA3838] hover:bg-[#ff3d3d]"} transition-colors`}
                  >
                    {livePublishing ? "going live…" : "go live. fast. dude."}
                  </button>
                </div>

                {/* live link shown only after publish */}
                {liveResultUrl && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#0f0f10] p-3">
                    <div className="text-sm text-[#C8CCD2]">live link:</div>
                    <a
                      href={liveResultUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 underline decoration-[#4b9fff]"
                    >
                      <ExtLinkIcon />
                      <span className="break-all">{liveResultUrl}</span>
                    </a>
                  </div>
                )}

                {/* footnote + any message */}
                <div className="mt-4 text-center text-[#9AA0A6]">
                  making your website live will enable anyone to use it anywhere.
                </div>
                {modal.note && (
                  <div className="mt-3 text-center text-red-400 text-sm">{modal.note}</div>
                )}
              </div>
            </div>
          </Modal>
        </>
      )}

      {view === "home" && (
        <footer className="pb-[22px]">
          <Container>
            <p className="mx-auto text-center text-[12px] leading-[18px] text-[#9AA0A6]">
              privacy policy  •  terms &amp; use  •  type it. see it. launch it. —— your ideas live in seconds.
              surfers codes anything better. faster.  •  2025 © surfers · {VERSION_TAG}
            </p>
          </Container>
        </footer>
      )}

      {authOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50">
          <div className="w-[400px] text-center p-8 rounded-xl bg-black border border-gray-800">
            <h1 className="text-3xl font-bold">account.</h1>
            <p className="text-gray-400 mb-6">create or log in.</p>

            {user ? (
              <>
                <p className="mb-4">Welcome, {user.displayName || user.phoneNumber || user.email}</p>
                <button onClick={handleLogout} className="w-full py-2 bg-[#FFFFFF] text-[#191919] font-medium rounded-lg">Logout</button>
              </>
            ) : (
              <>
                <button onClick={handleGoogleLogin} className="bg-[#1a73e8] text-white font-medium w-full py-2 rounded-lg flex items-center justify-center gap-2">
                  <span className="font-bold">G</span> continue with Google
                </button>

                <div className="my-4 flex items-center">
                  <div className="flex-grow border-t border-gray-600"></div>
                  <span className="px-2 text-gray-400">or</span>
                  <div className="flex-grow border-t border-gray-600"></div>
                </div>

                {!otpSent ? (
                  <>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" className="w-full px-3 py-2 rounded-lg border border-gray-600 bg白 text-[#232323] font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={sendOtp} className="w-full mt-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">send OTP</button>
                  </>
                ) : (
                  <>
                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="enter OTP" className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-white text-[#232323] font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={verifyOtp} className="w-full mt-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">verify OTP</button>
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

            <button onClick={() => { resetPhoneAuth(); setAuthOpen(false); }} className="mt-4 text-sm text-gray-400 underline">close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**********************
 * Export default wrapped with ErrorBoundary
 **********************/
export default function App() {
  return (
    <ErrorBoundary>
      <SurfersApp />
    </ErrorBoundary>
  );
}
