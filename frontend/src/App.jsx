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

/**********************
 * ERROR BOUNDARY
 * Prevent a blank screen by catching render/runtime errors
 **********************/
import React from "react";
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
    console.error("\n[ErrorBoundary] App crashed:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: "#eee", background: "#0B0B0C", minHeight: "100vh" }}>
          <div style={{
            maxWidth: 720,
            margin: "40px auto",
            background: "#121214",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: 16,
          }}>
            <h2 style={{ marginTop: 0 }}>something broke. 😵‍💫</h2>
            <p style={{ opacity: 0.8 }}>the app hit a runtime error but stayed up thanks to the error boundary.</p>
            <pre style={{ whiteSpace: "pre-wrap", background: "#0f0f10", padding: 12, borderRadius: 12, border: "1px solid #2A2A2A" }}>{this.state.msg}</pre>
            <p style={{ opacity: 0.7, fontSize: 12 }}>check the console for stack trace (DevTools ▶ Console).</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**********************
 * Utility Container
 **********************/
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
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.5s" repeatCount="indefinite" />
      </path>
    </g>
  </svg>
);

/**********************
 * Modal + tiny button (for code / view / go live)
 **********************/
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="relative w-[min(960px,92vw)] h-[min(80vh,720px)] rounded-2xl border border-[#2A2A2A] bg-[#0B0B0C] p-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-[#121214] text-[#EDEDED] hover:bg-[#1A1A1B]"
          aria-label="close"
        >
          ×
        </button>
        {title && <h3 className="text-lg mb-3 text-[#EDEDED]">{title}</h3>}
        <div className="w-full h-[calc(100%-40px)] overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#111214]">
          {children}
        </div>
      </div>
    </div>
  );
};

/**********************
 * Markdown with code highlight (safe)
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
    return () => { mounted = false; };
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
        ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 mb-3 space-y-1" />,
        ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 mb-3 space-y-1" />,
        li: ({ node, ...props }) => <li {...props} className="leading-6" />,
        h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-semibold mb-2 mt-3" />,
        h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-semibold mb-2 mt-3" />,
        h3: ({ node, ...props }) => <h3 {...props} className="text-base font-semibold mb-2 mt-3" />,
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
 * Streaming tuning constants
 **********************/
// Abort only when the stream is silent for this long
const STREAM_INACTIVITY_MS = 25000; // 25s of no data
// Optional: a hard cap for super-long generations (set 0 to disable)
const STREAM_MAX_DURATION_MS = 180000; // 3 minutes

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
  const [images, setImages] = useState([]);   // {file, url, name}
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

  // streaming control (kept for future Stop button)
  const [isStreaming, setIsStreaming] = useState(false);
  const [phase, setPhase] = useState(null); // 'connecting' | 'thinking' | 'generating' | 'coding' | null
  const atBottomRef = useRef(true);          // live flag: are we near the bottom?
  const [showJump, setShowJump] = useState(false); // show "jump to latest" button (future)

  const streamAbortRef = useRef(null);   // holds AbortController for the active stream
  const interruptedRef = useRef(false);  // prevents double-abort spam on keypress
  // ---- Smooth streaming buffer (prevents re-render on every token) ----
  const streamBufRef = useRef({ buf: "", t: null });

  const flushNow = (asstId) => {
    if (!streamBufRef.current.buf) return;
    appendToAssistant(asstId, streamBufRef.current.buf);
    streamBufRef.current.buf = "";
  };

  const scheduleFlush = (asstId) => {
    if (streamBufRef.current.t) return;
    // ~30fps flush cadence
    streamBufRef.current.t = setTimeout(() => {
      streamBufRef.current.t = null;
      flushNow(asstId);
    }, 33);
  };

  const prevUidRef = useRef(null); // Track which user the UI state belongs to

  // chat attachments
  const [chatImages, setChatImages] = useState([]); // {file, url, name}
  const [chatFigmas, setChatFigmas] = useState([]);
  const [showChatAttach, setShowChatAttach] = useState(false);

  const chatEndRef = useRef(null);

  // pending (store what a logged-out user tried to send)
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingImages, setPendingImages] = useState([]);

  // action modals
  const [modal, setModal] = useState({ type: null, msgId: null, code: "", lang: "", url: "", note: "" });
  const previewUrlRef = useRef(null);

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

  // typing/deleting loop (paused when user has typed something)
  useEffect(() => {
    if (prompt) return; // pause when user is typing
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

  // observe bottom visibility (for a future "jump to latest")
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
    if (view === "home") {
      stopStreaming();
    }
  }, [view]);

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
    const el = textareaRef.current; if (!el) return;
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
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: (m.content || "") + (chunk || "") } : m)));
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

  // STREAMING via fetch + FormData (supports images) — idle-based timeout
  async function sendMessageStream(text, attachments = []) {
    const userId = Date.now();
    setMessages((prev) => [...prev, { id: userId, role: "user", content: text }]);
    const asstId = addAssistantPlaceholder();
    setPhase("connecting");
    // reset streaming buffer for this message
    streamBufRef.current.buf = "";
    if (streamBufRef.current.t) 
    { clearTimeout(streamBufRef.current.t); 
      streamBufRef.current.t = null; }

    scrollMessageToTop(userId);

    const hist = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    const formData = new FormData();
    formData.append("prompt", text);
    formData.append("history", JSON.stringify(hist));
    attachments.forEach((img) => {
      if (img?.file) formData.append("images", img.file, img.name || "image.png");
    });

    const ac = new AbortController();
    streamAbortRef.current = ac;
    interruptedRef.current = false;

    // timers — reset on every chunk
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
      let leftover = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        let data = leftover + chunkStr;
        leftover = "";

        const doneIdx = data.indexOf("[DONE]");
        if (doneIdx !== -1) {
          const before = data.slice(0, doneIdx);
          if (before) {
            // buffer the final chunk BEFORE [DONE]
            streamBufRef.current.buf += before;   // <-- use `before` here
            scheduleFlush(asstId);
            if (/\S/.test(before)) gotAny = true;
          }

          // force one last flush at the end of the stream
          flushNow(asstId);
          break;
        }

        if (data) {
          // buffer regular streaming chunks
          streamBufRef.current.buf += data;       // <-- use `data` here
          scheduleFlush(asstId);
          if (/\S/.test(data)) gotAny = true;

          // phase hints
          if (/```|\b(import|class|def|function|const|let|var)\b/.test(data)) {
            setPhase("coding");
          } else if (!gotAny) {
            setPhase("generating");
          }
        }

        // reset idle timer on every chunk
        armTimers();
      }
    } catch (err) {
      const msg = String(err?.name || err || "");
      const reason = (err && "message" in err) ? String(err.message) : msg;
      if (!/AbortError/i.test(msg) && !/AbortError/i.test(reason) && !/manual-stop|user-typed|new-message|stream-timeout|idle-timeout|max-duration/.test(reason)) {
        appendToAssistant(asstId, `\n// stream error: ${String(err)}`);
      }
    } finally {
      clearTimers();
      if (streamAbortRef.current === ac) streamAbortRef.current = null;
      if (!gotAny) {
        appendToAssistant(asstId, "\n// (no content received — check server logs or network)");
      }
      setPhase(null);
      setIsStreaming(false);
    }
  }

  // HOME SUBMIT — clear input BEFORE sending
  async function onSubmit(e) {
    e.preventDefault();
    // Optional: when user sends a new message, cancel the previous stream
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

  // hide fenced code blocks from chat bubble
  const stripFencedCodeBlocks = (text) => (text || "").replace(/```[\s\S]*?```/g, "");

  const openCodeModal = (id) => {
    const msg = getMsgById(id);
    const { lang, code } = extractFirstCodeBlock(msg?.content || "");
    setModal({ type: "code", msgId: id, code, lang, url: "", note: code ? "" : "No fenced code block found in this message." });
  };

  const openViewModal = (id) => {
    const msg = getMsgById(id);
    const { lang, code } = extractFirstCodeBlock(msg?.content || "");
    let url = "", note = "";
    if (lang === "html" && code) {
      const blob = new Blob([code], { type: "text/html" });
      url = URL.createObjectURL(blob);
      if (previewUrlRef.current) try { URL.revokeObjectURL(previewUrlRef.current); } catch {}
      previewUrlRef.current = url;
    } else {
      note = "Preview requires an HTML code block. Open Code to copy/run elsewhere.";
    }
    setModal({ type: "view", msgId: id, code, lang, url, note });
  };

  const openLiveModal = (id) => {
    const msg = getMsgById(id);
    const { lang, code } = extractFirstCodeBlock(msg?.content || "");
    setModal({
      type: "live",
      msgId: id,
      code,
      lang,
      url: "",
      note: "Deploy flow coming soon. Export your code and deploy to Vercel/Netlify."
    });
  };

  const closeModal = () => {
    if (modal.url && modal.url.startsWith("blob:")) {
      try { URL.revokeObjectURL(modal.url); } catch {}
    }
    setModal({ type: null, msgId: null, code: "", lang: "", url: "", note: "" });
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

                // hide code from chat bubble
                const cleaned = isAssistant ? stripFencedCodeBlocks(m.content || "") : (m.content || "");
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

                            {/* action bar (only after stream ends) */}
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

          <Modal open={modal.type === "view"} onClose={closeModal} title="Preview">
            {modal.url
              ? <iframe src={modal.url} className="w-full h-full" />
              : <div className="p-4 text-[#c7cbd2]">{modal.note}</div>
            }
          </Modal>

          <Modal open={modal.type === "live"} onClose={closeModal} title="Go live">
            <div className="w-full h-full overflow-auto p-4 text-[#EDEDED]">
              <p>{modal.note}</p>
              {modal.code && (
                <>
                  <p className="mt-4 mb-2 text-sm text-[#c7cbd2]">quick copy:</p>
                  <pre className="mb-0 rounded-[12px] bg-[#0f0f10] border border-[#2A2A2A] overflow-x-auto p-3 text-xs">
                    {modal.code}
                  </pre>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(modal.code)}
                    className="mt-3 px-4 py-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1B] hover:bg-[#232325]"
                  >
                    copy code
                  </button>
                </>
              )}
            </div>
          </Modal>
        </>
      )}

      {view === "home" && (
        <footer className="pb-[22px]">
          <Container>
            <p className="mx-auto text-center text-[12px] leading-[18px] text-[#9AA0A6]">
              privacy policy  •  terms &amp; use  •  type it. see it. launch it. —— your ideas live in seconds.
              surfers codes anything better. faster.  •  2025 © surfers.
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
              privacy policy • terms &amp; use • type it. see it.<br />
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
