import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
            TM
          </span>
          <span className="text-sm font-semibold text-white sm:text-base">
            Task Management Portal
          </span>
        </Link>

        {/* <ul className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <li>
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
          </li>
          <li>
            <a href="#about" className="transition-colors hover:text-white">
              About
            </a>
          </li>
        </ul> */}

        <Link
          href="/login"
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Sign in
        </Link>
      </nav>
    </header>
  );
}
