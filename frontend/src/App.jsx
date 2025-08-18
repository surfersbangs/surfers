import { useState } from "react";

const Container = ({ children, className = "" }) => (
  <div className={`mx-auto ${className}`} style={{ width: "min(1120px, 90vw)" }}>
    {children}
  </div>
);

// Inline SVG placeholders — swap with your real assets in /public when ready
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

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  async function onSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setCode("");
    try {
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
          <form onSubmit={onSubmit} className="w-[720px] max-w-[90vw]">
            <div className="relative bg-[#121214] border border-[#2A2A2A] rounded-[28px] px-[22px] pt-[14px] pb-[44px] shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
              <textarea
                rows={1}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="build fast. for nothing."
                className="w-full bg-transparent resize-none outline-none text-[14px] leading-[20px] placeholder:text-[#9AA0A6] text-[#EDEDED]"
              />
              <div className="absolute left-[18px] right-[18px] bottom-[12px] flex items-center justify-between">
                <button
                  type="button"
                  aria-label="add"
                  className="text-[#C8CCD2] text-[18px] leading-none hover:text-white transition-colors"
                >
                  +
                </button>
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
          </form>

          {/* Show returned code (debug) */}
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
            privacy policy • terms &amp; use • type it. see it. launch it. —— your ideas live in seconds. surfers codes anything better. faster. • 2025 © surfers.
          </p>
        </Container>
      </footer>
    </div>
  );
}
