"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/reusable/footer";

// Replace with a local image when ready, e.g. "/images/hero-workspace.jpg"
const HERO_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80";

export default function Home() {
  const router = useRouter();
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.85s ease-out both;
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out both;
        }

        .animate-delay-150 {
          animation-delay: 150ms;
        }

        .animate-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>

      <div className="flex min-h-screen flex-col">
        <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${HERO_BACKGROUND_IMAGE}')` }}
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-indigo-950/75 to-blue-950/80"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
            aria-hidden="true"
          />

          <div className="animate-fade-in-up relative z-10 w-full max-w-2xl">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl sm:p-10 md:p-12">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/15 px-4 py-1.5 text-xs font-medium tracking-wide text-indigo-100 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Task Management Platform
              </div>

              <h1 className="animate-fade-in-up animate-delay-150 text-center text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                CRUD Auth Task Management Portal
              </h1>

              <p className="animate-fade-in-up animate-delay-300 mx-auto mt-5 max-w-xl text-center text-base leading-relaxed text-slate-200 sm:text-lg">
                Organize tasks, assign work, track progress, upload files
                securely, and collaborate efficiently from one modern platform.
              </p>

              <div className="animate-fade-in-up animate-delay-300 mt-10 flex flex-col items-center justify-center gap-3">

                {/* Visit Portal */}
                <Link
                  href="/login"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-700/50 sm:w-auto sm:min-w-[220px] sm:text-lg"
                >
                  Visit Portal →
                </Link>

                {/* Recruiter Demo */}
                

              </div>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}
