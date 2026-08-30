export default function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
      <div className="absolute -left-6 top-8 hidden h-24 w-24 rounded-2xl bg-indigo-400/20 blur-2xl sm:block" />
      <div className="absolute -right-4 bottom-4 hidden h-28 w-28 rounded-full bg-violet-400/20 blur-2xl sm:block" />

      <svg
        viewBox="0 0 480 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full drop-shadow-2xl"
        role="img"
        aria-label="Task management dashboard illustration"
      >
        <rect
          x="40"
          y="24"
          width="400"
          height="272"
          rx="16"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="2"
        />
        <rect x="56" y="44" width="120" height="12" rx="6" fill="#475569" />
        <rect x="56" y="68" width="80" height="8" rx="4" fill="#334155" />

        <rect
          x="56"
          y="100"
          width="160"
          height="88"
          rx="10"
          fill="#0f172a"
          stroke="#334155"
        />
        <rect x="72" y="116" width="100" height="8" rx="4" fill="#6366f1" />
        <rect x="72" y="132" width="128" height="6" rx="3" fill="#475569" />
        <rect x="72" y="148" width="90" height="6" rx="3" fill="#475569" />
        <circle cx="84" cy="172" r="6" fill="#22c55e" />
        <rect x="96" y="168" width="72" height="6" rx="3" fill="#64748b" />

        <rect
          x="232"
          y="100"
          width="160"
          height="88"
          rx="10"
          fill="#0f172a"
          stroke="#334155"
        />
        <rect x="248" y="116" width="100" height="8" rx="4" fill="#8b5cf6" />
        <rect x="248" y="132" width="128" height="6" rx="3" fill="#475569" />
        <circle cx="260" cy="156" r="6" fill="#22c55e" />
        <rect x="272" y="152" width="88" height="6" rx="3" fill="#64748b" />
        <circle cx="260" cy="176" r="6" stroke="#64748b" strokeWidth="2" />
        <rect x="272" y="172" width="72" height="6" rx="3" fill="#475569" />

        <rect
          x="56"
          y="204"
          width="336"
          height="72"
          rx="10"
          fill="#0f172a"
          stroke="#334155"
        />
        <rect
          x="72"
          y="220"
          width="48"
          height="40"
          rx="8"
          fill="#1e3a5f"
          stroke="#3b82f6"
          strokeWidth="1.5"
        />
        <rect
          x="136"
          y="220"
          width="48"
          height="40"
          rx="8"
          fill="#312e81"
          stroke="#6366f1"
          strokeWidth="1.5"
        />
        <rect
          x="200"
          y="220"
          width="48"
          height="40"
          rx="8"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="1.5"
        />
        <rect x="264" y="228" width="112" height="8" rx="4" fill="#475569" />
        <rect x="264" y="244" width="80" height="6" rx="3" fill="#334155" />

        <circle cx="400" cy="52" r="14" fill="#6366f1" />
        <path
          d="M395 52 L399 56 L407 48"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
