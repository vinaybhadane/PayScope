import React from "react";

export interface MerchantLogoProps {
  name: string;
  category?: string;
  size?: number;
  className?: string;
}

export function MerchantLogo({
  name,
  category,
  size = 36,
  className = "",
}: MerchantLogoProps) {
  const normalized = (name || "").toLowerCase().trim();

  // Known brand icon and color detection
  if (normalized.includes("netflix")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-[#E50914] text-white flex items-center justify-center font-black shadow-md shrink-0 border border-red-500/30 ${className}`}
        title="Netflix"
      >
        <span style={{ fontSize: size * 0.55 }} className="font-serif tracking-tighter">N</span>
      </div>
    );
  }

  if (normalized.includes("spotify")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-[#1DB954] text-black flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-md ${className}`}
        title="Spotify"
      >
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.793-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.506 9.722 1.113.294.18.387.563.207.857zm1.225-2.724c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.126-.849-.108-.975-.521-.125-.413.108-.849.521-.975 3.632-1.102 8.147-.568 11.234 1.332.366.226.481.707.257 1.073zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.129-1.166-.622-.149-.493.13-1.016.623-1.166 3.535-1.073 9.404-.866 13.115 1.337.444.263.59.838.327 1.282-.264.443-.838.59-1.282.324z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("amazon") || normalized.includes("prime")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-[#232F3E] text-[#FF9900] flex items-center justify-center font-bold shrink-0 border border-amber-500/30 shadow-md ${className}`}
        title="Amazon"
      >
        <span style={{ fontSize: size * 0.58 }} className="font-sans lowercase font-black leading-none">a</span>
      </div>
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-[#FF0000] text-white flex items-center justify-center shrink-0 border border-red-500/30 shadow-md ${className}`}
        title="YouTube"
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("google")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-white text-slate-900 flex items-center justify-center shrink-0 border border-slate-200 shadow-md ${className}`}
        title="Google"
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("openai") || normalized.includes("chatgpt")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-[#10A37F] text-white flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-md ${className}`}
        title="OpenAI"
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" strokeLinecap="round" opacity={0.7} />
        </svg>
      </div>
    );
  }

  if (normalized.includes("adobe")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-[#FF0000] text-white flex items-center justify-center font-black shrink-0 border border-red-500/30 shadow-md ${className}`}
        title="Adobe"
      >
        <span style={{ fontSize: size * 0.55 }} className="font-sans font-black">A</span>
      </div>
    );
  }

  if (normalized.includes("devstack") || normalized.includes("cloud") || normalized.includes("clouddesk") || normalized.includes("skyvault")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 border border-blue-400/30 shadow-md ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("suraksha") || normalized.includes("insurance")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-md ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("zenith") || normalized.includes("fitness") || normalized.includes("gym")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 border border-orange-400/30 shadow-md ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("fibernet") || normalized.includes("broadband") || normalized.includes("telecom")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center shrink-0 border border-cyan-400/30 shadow-md ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("cab") || normalized.includes("uber") || normalized.includes("ola") || normalized.includes("transport")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shrink-0 border border-amber-300/40 shadow-md font-bold ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("aqua") || normalized.includes("water") || normalized.includes("springs")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shrink-0 border border-sky-400/30 shadow-md ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("cine") || normalized.includes("movie") || normalized.includes("stream") || normalized.includes("indiewatch")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shrink-0 border border-purple-400/30 shadow-md ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      </div>
    );
  }

  if (normalized.includes("synthwrite") || normalized.includes("write") || normalized.includes("notion")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shrink-0 border border-violet-400/30 shadow-md font-bold ${className}`}
        title={name}
      >
        <span style={{ fontSize: size * 0.5 }} className="font-mono font-bold">W</span>
      </div>
    );
  }

  if (normalized.includes("food") || normalized.includes("cafe") || normalized.includes("roast") || normalized.includes("bites")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center shrink-0 border border-rose-400/30 shadow-md ${className}`}
        title={name}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
    );
  }

  // Fallback: Dynamic deterministic monogram gradient
  const initials = (name || "Company")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const palettes = [
    "from-cyan-600 to-blue-700 text-cyan-100 border-cyan-400/30",
    "from-indigo-600 to-purple-700 text-indigo-100 border-indigo-400/30",
    "from-emerald-600 to-teal-700 text-emerald-100 border-emerald-400/30",
    "from-amber-600 to-orange-700 text-amber-100 border-amber-400/30",
    "from-rose-600 to-pink-700 text-rose-100 border-rose-400/30",
    "from-sky-600 to-cyan-700 text-sky-100 border-sky-400/30",
  ];

  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = palettes[Math.abs(hash) % palettes.length];

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-gradient-to-br ${palette} flex items-center justify-center font-bold font-mono tracking-wider shadow-md shrink-0 border ${className}`}
      title={name}
    >
      <span style={{ fontSize: size * 0.44 }}>{initials || "CO"}</span>
    </div>
  );
}

export default MerchantLogo;
