import { useState, useRef, useEffect } from "react";

const Container = ({ children, className = "" }) => (
  <div className={`mx-auto ${className}`} style={{ width: "min(1120px, 90vw)" }}>
    {children}
  </div>
);

// ------- Inline SVG placeholders (swap with your assets when ready) -------
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

// small icons for popover
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

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  // attachments (shown INSIDE the pill)
  const [images, setImages] = useState([]);
  const [figmas, setFigmas] = useState([]);
  const [showAttach, setShowAttach] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // refs
  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const attachRef = useRef(null);
  const fileInputRef = useRef(null);

  // ===== cap textarea growth to N lines (ChatGPT style) =====
  const LINE_HEIGHT_PX = 20; // matches leading-[20px]
  const MAX_LINES = 7;       // change to 5–8 as you like
  const MAX_TA_HEIGHT = LINE_HEIGHT_PX * MAX_LINES;

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px"; // reset
    const next = Math.min(el.scrollHeight, MAX_TA_HEIGHT);
    el.style.height = next + "px";
    el.style.overflowY = el.scrollHeight > MAX_TA_HEIGHT ? "auto" : "hidden";
  };
  useEffect(() => { resizeTextarea(); }, [prompt]);

  // close popover on outside click / Esc
  useEffect(() => {
    if (!showAttach) return;
    const onClick = (e) => { if (attachRef.current && !attachRef.current.contains(e.target)) setShowAttach(false); };
    const onEsc = (e) => { if (e.key === "Escape") setShowAttach(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showAttach]);

  // add image flow
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

  // add figma flow
  const onAddFigmaClick = () => {
    const url = window.prompt("Paste Figma link:");
    if (!url) return;
    const ok = /figma\.com\/(file|design)\//i.test(url);
    if (!ok) { alert("That doesn't look like a Figma file link."); return; }
    setFigmas((prev) => [...prev, url]);
    setShowAttach(false);
  };

  // remove attachment
  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const removeFigma = (i) => setFigmas((prev) => prev.filter((_, idx) => idx !== i));

  // submit to backend
  async function onSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setCode("");
    try {
      // TODO: include images/figmas in payload when backend supports it
      const res = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCode(data.code || "");
    } catch (err) {
      setCode(`// Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#EDEDED] font-wix flex flex-col">
      {/* ===== NAV ===== */}
      <header className="pt-4">
        <Container>
          <div className="relative h-[28px] flex items-center">
            <LogoSmall className="h-[18px] w-[18px]" />
            <nav className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex gap-[36px] text-[14px] leading-[20px] text-[#D1D5DB]">
              <a href="#" className="hover:text-[#A8ADB5]">community</a>
              <a href="#" className="hover:text-[#A8ADB5]">developers</a>
            </nav>
            <div className="ml-auto">
              <ProfileIcon className="h-[18px] w-[18px]" />
            </div>
          </div>
        </Container>
      </header>

      {/* ===== HERO ===== */}
      <main className="flex-1">
        <Container className="flex flex-col items-center">
          <div className="h-[120px]" />
          <LogoLarge className="h-[88px] w-[88px]" />
          <div className="h-[28px]" />

          {/* Form wraps the pill so ↑ submits */}
          <form ref={formRef} onSubmit={onSubmit} className="w-[720px] max-w-[90vw]">
            <div className="relative bg-[#121214] border border-[#2A2A2A] rounded-[28px] px-[22px] pt-[14px] pb-[44px] shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
              {/* ---------- ATTACHMENTS (inside the pill) ---------- */}
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
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[12px] leading-[20px] flex items-center justify-center"
                        title="remove"
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
                        className="ml-1 h-5 w-5 rounded-full bg-[#1B1B1C] hover:bg-[#222] text-white text-[12px] leading-[20px] flex items-center justify-center"
                        title="remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ---------- Editable prompt line (auto-expands w/ cap) ---------- */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onInput={resizeTextarea}
                onKeyDown={(e) => {
                  // Enter to send; Shift+Enter for newline
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
                placeholder="build fast. for nothing."
                className="w-full bg-transparent outline-none
                           text-[14px] leading-[20px]
                           placeholder:text-[#9AA0A6] text-[#EDEDED]
                           resize-none"
                style={{
                  maxHeight: `${MAX_TA_HEIGHT}px`,
                  overflowY: "hidden",
                }}
              />

              {/* ---------- Bottom controls (plus + send) ---------- */}
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
                    <div
                      className="
                        absolute -top-2 left-0 -translate-y-full
                        w-[180px] rounded-[12px] bg-white text-black
                        border border-neutral-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)]
                        p-2
                      "
                    >
                      <button
                        type="button"
                        onClick={onAddImageClick}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100"
                      >
                        <ImageIcon />
                        <span className="text-[14px] text-neutral-800">add image</span>
                      </button>
                      <button
                        type="button"
                        onClick={onAddFigmaClick}
                        className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-[8px] hover:bg-neutral-100"
                      >
                        <FigmaIcon />
                        <span className="text-[14px] text-neutral-800">add figma</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  aria-label="send"
                  disabled={loading}
                  className={`h-[28px] w-[28px] rounded-full ${
                    loading ? "bg-[#2A2A2B] text-[#9AA0A6]" : "bg-[#1A1A1B] hover:bg-[#232325] text-[#DADDE2]"
                  } flex items-center justify-center transition-colors`}
                  title={loading ? "Generating…" : "Send"}
                >
                  {loading ? "…" : "↑"}
                </button>
              </div>
            </div>

            {/* hidden input for image selection */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFilesPicked}
            />
          </form>

          {/* Debug: returned code */}
          {code ? (
            <div className="w-[720px] max-w-[90vw] mt-4">
              <pre className="whitespace-pre-wrap text-[12px] leading-5 text-[#C9D1D9] bg-[#111214] border border-[#2A2A2A] rounded-[12px] p-4 overflow-x-auto">
                {code}
              </pre>
            </div>
          ) : null}
        </Container>
      </main>

      {/* ===== LEGAL ===== */}
      <footer className="pb-[22px]">
        <Container>
          <p className="mx-auto text-center text-[12px] leading-[18px] text-[#9AA0A6]">
            privacy policy  •  terms &amp; use  •  type it. see it. launch it. —— your ideas live in seconds.
            surfers codes anything better. faster.  •  2025 © surfers.
          </p>
        </Container>
      </footer>
    </div>
  );
}
