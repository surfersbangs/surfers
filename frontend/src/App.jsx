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

// ====== Utility Container ======
const Container = ({ children, className = "" }) => (
  <div className={`mx-auto ${className}`} style={{ width: "min(1120px, 90vw)" }}>
    {children}
  </div>
);

// ====== Logos / Icons ======
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

// small icons
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
// loader
const Spinner = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <g fill="none" stroke="#C8CCD2" strokeWidth="2">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </g>
  </svg>
);

// ====== Markdown with safe code highlighter ======
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
          codeRef.current.textContent = raw;
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

// ====== MAIN APP ======
export default function App() {
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
  const [showJump, setShowJump] = useState(false); // show "jump to latest" button

  const streamRef = useRef(null); // unused with fetch streaming, safe to keep
 
  const prevUidRef = useRef(null); // Track which user the UI state belongs to


  // chat attachments
  const [chatImages, setChatImages] = useState([]); // {file, url, name}
  const [chatFigmas, setChatFigmas] = useState([]);
  const [showChatAttach, setShowChatAttach] = useState(false);

  const chatEndRef = useRef(null);
  const scrollRaf = useRef(0);

  // pending (store what a logged-out user tried to send)
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingImages, setPendingImages] = useState([]); 
  // same shape as images/chatImages


  // observe bottom
  useEffect(() => {
    if (!chatEndRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nearBottom = entry.isIntersecting;
        atBottomRef.current = nearBottom;
        setShowJump(!nearBottom);
      },
      {
        root: null,
        threshold: 0.01,
        rootMargin: "0px 0px -96px 0px",
      }
    );
    observer.observe(chatEndRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, (currentUser) => {
    const newUid = currentUser?.uid || null;
    const prevUid = prevUidRef.current;

    // If user switched (or logged out / logged in), wipe the in-memory chat
    if (newUid !== prevUid) {
      clearConversationState();
    }

    setUser(currentUser);
    prevUidRef.current = newUid;
  });
  return () => unsub();
}, []);


  // When the user logs in and we have a pending message, auto-send it and go to chat
useEffect(() => {
  if (user && pendingPrompt) {
    const toSend = pendingPrompt;
    const imgs = pendingImages;

    // clear pending & close auth
    setPendingPrompt("");
    setPendingImages([]);
    setAuthOpen(false);

    // go to chat and send
    setView("chat");
    setTimeout(() => {
      sendMessageStream(toSend, imgs);
      // clear home composer so it doesn't duplicate later
      setPrompt("");
      setImages([]);
      setFigmas([]);
    }, 0);
  }
}, [user, pendingPrompt, pendingImages]);


  useEffect(() => () => stopStreaming(), []);

  // Stop streaming on leaving chat
  useEffect(() => {
    if (view === "home") {
      stopStreaming();
    }
  }, [view]);

  const resetPhoneAuth = () => {
    setPhone(""); setOtp(""); setOtpSent(false); setConfirmation(null);
    if (window.recaptchaVerifier) { try { window.recaptchaVerifier.clear(); } catch {} window.recaptchaVerifier = null; }
  };

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); resetPhoneAuth(); setAuthOpen(false); }
    catch (err) { console.error(err); }
  };
  const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  } finally {
    resetPhoneAuth();
    setAuthOpen(false);
    clearConversationState();   // <- wipe previous account’s chat
    setView("home");            // optional: kick back to home
  }
  }; 
  
  const sendOtp = async () => {
    try {
      if (!window.recaptchaVerifier) {
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
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (view === "home" && textareaRef.current) textareaRef.current.focus();
      if (view === "chat" && chatTextareaRef.current) chatTextareaRef.current.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  // auto focus chat box when entering chat view
  useEffect(() => {
    if (view === "chat") {
      chatTextareaRef.current?.focus();
    }
  }, [view]);

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

  // streaming helpers
  const addAssistantPlaceholder = () => {
    const id = Date.now() + Math.random();
    setMessages((prev) => [...prev, { id, role: "assistant", content: "" }]);
    return id;
  };
  const appendToAssistant = (id, chunk) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: (m.content || "") + (chunk || "") } : m)));
  };

// Snap a message to the TOP of the viewport
const scrollMessageToTop = (msgId) => {
  requestAnimationFrame(() => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

  const stopStreaming = () => {
    try { streamRef.current?.close?.(); } catch {}
    streamRef.current = null;
    setIsStreaming(false);
    setPhase(null);
  };

  // Wipe all in-memory chat/UI state when user changes
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

      // add attached images from HOME composer
      images.forEach((img) => {
        formData.append("images", img.file, img.name);
      });

      const res = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || data.code || "";
      setMessages((prev) => [...prev, { id: id + 1, role: "assistant", content: reply || "…" }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: id + 1, role: "assistant", content: `// Error: ${String(err)}` }]);
    }
  }

  // streaming via fetch + FormData (supports images) — manual scroll UX
async function sendMessageStream(text, attachments = []) {
  // 1) push user message
  const userId = Date.now();
  setMessages((prev) => [...prev, { id: userId, role: "user", content: text }]);

  // 2) add assistant placeholder (where tokens will stream)
  const asstId = addAssistantPlaceholder();
  setPhase("connecting");

  // 3) SNAP the just-sent user bubble to TOP of viewport
  scrollMessageToTop(userId);

  // 4) prepare payload (include last 8 messages + any images)
  const hist = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
  const formData = new FormData();
  formData.append("prompt", text);
  formData.append("history", JSON.stringify(hist));
  attachments.forEach((img) => {
    formData.append("images", img.file, img.name);
  });

  try {
    setIsStreaming(true);

    // NOTE: this calls POST /api/stream-es which you added on the backend
    const res = await fetch(`${API_URL}/api/stream-es`, {
      method: "POST",
      body: formData,
    });

    if (!res.body) throw new Error("No response body (streaming)");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let gotAny = false;
    let sawCode = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // If your backend sends SSE-like lines, you can parse them here.
      // If you also send a "[DONE]" sentinel, you can detect & break:
      if (chunk.includes("[DONE]")) {
        // ❌ No auto-scroll at the end (manual UX)
        setPhase(null);
        setIsStreaming(false);
        break;
      }

      if (!gotAny) {
        setPhase("generating");
        gotAny = true;
      }
      if (
        !sawCode &&
        (/```/.test(chunk) || /\b(import|class|def|function|const|let|var)\b/.test(chunk))
      ) {
        setPhase("coding");
        sawCode = true;
      }

      appendToAssistant(asstId, chunk);
    }
  } catch (err) {
    appendToAssistant(asstId, `\n// stream error: ${String(err)}`);
    setPhase(null);
    setIsStreaming(false);
  }
}

  // HOME SUBMIT
// HOME SUBMIT
// HOME SUBMIT — clear input BEFORE sending
async function onSubmit(e) {
  e.preventDefault();
  if (!prompt.trim() && images.length === 0) return;

  const first = prompt.trim();
  const imgs = images; // preserve attachments before clearing

  // If not logged in, stash and show auth
  if (!user) {
    setPendingPrompt(first);
    setPendingImages(imgs);

    // clear the composer immediately
    setPrompt("");
    setImages([]);
    setFigmas([]);

    setAuthOpen(true);
    return;
  }

  // clear BEFORE sending so UI empties instantly
  setPrompt("");
  setImages([]);
  setFigmas([]);

  setView("chat");

  // fire-and-forget so the clear renders immediately
  setTimeout(() => {
    sendMessageStream(first, imgs);
  }, 0);
}



  // CHAT SEND
// CHAT SEND
// CHAT SEND — clear input BEFORE sending
const sendFromChat = (e) => {
  e.preventDefault();
  if (!chatInput.trim() && chatImages.length === 0) return;

  const txt = chatInput.trim();
  const imgs = chatImages; // preserve attachments

  if (!user) {
    // stash for after-login auto-send
    setPendingPrompt(txt);
    setPendingImages(imgs);

    // clear chat composer immediately
    setChatInput("");
    setChatImages([]);
    setChatFigmas([]);

    setAuthOpen(true);
    return;
  }

  // clear BEFORE sending so the textarea empties right away
  setChatInput("");
  setChatImages([]);
  setChatFigmas([]);

  // fire-and-forget
  setTimeout(() => {
    sendMessageStream(txt, imgs);
  }, 0);
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

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onInput={resizeTextarea}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); formRef.current?.requestSubmit(); } }}
                  placeholder="build fast. for nothing."
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

                return (
                  <div  id={`msg-${m.id}`} key={m.id} className={`mb-4 flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[720px] rounded-2xl px-4 py-3 leading-6 ${isAssistant ? "bg-transparent text-[#EDEDED]" : "bg-[#1A1A1B] text-[#EDEDED]"}`}
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {isAssistant ? (
                        hasContent ? (
                          <Markdown>{m.content}</Markdown>
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
                    placeholder="build fast. for nothing."
                    className="w-full bg-transparent outline-none text-[14px] leading-[20px] placeholder:text-[#9AA0A6] text-[#EDEDED] resize-none"
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
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-white text-[#232323] font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
              privacy policy • terms &amp; use • type it. see it. launch it.<br />
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
