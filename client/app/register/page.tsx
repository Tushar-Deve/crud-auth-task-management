"use client";

import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    Eye,
    EyeOff,
    LayoutDashboard,
    Loader2,
    Mail,
    Lock,
    User,
    Shield,
} from "lucide-react";
import { registerUser } from "@/services/authService";
import RegisterOtpModal from "@/components/RegisterOtpModal";

const BACKGROUND_IMAGE =
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);

    const isDisabled =
        !name.trim() ||
        !email.trim() ||
        !password.trim() ||
        !confirmPassword.trim() ||
        isLoading;


    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            setIsLoading(true);

            const response = await registerUser(
                name.trim(),
                email.trim(),
                password
            );

            toast.success(
                response.message || "OTP sent to your email"
            );

            setShowOtpModal(true);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message ||
                    "Registration failed"
                );
                return;
            }

            console.error(error);
            toast.error("Unexpected error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.75s ease-out both;
        }
      `}</style>

            <div className="relative flex h-screen flex-col overflow-hidden">
                {/* Background */}
                <div
                    className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `url('${BACKGROUND_IMAGE}')`,
                    }}
                    aria-hidden="true"
                />

                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/85 via-indigo-950/80 to-purple-950/85"
                    aria-hidden="true"
                />

                <div
                    className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
                    aria-hidden="true"
                />

                <div
                    className="pointer-events-none absolute -right-32 bottom-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl"
                    aria-hidden="true"
                />

                {/* Main */}
                <main className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
                    <div className="animate-fade-in-up w-full max-w-5xl">
                        <div className="grid gap-8 rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl lg:grid-cols-[1.6fr_1fr] sm:p-10">

                            {/* Register Form */}
                            <div>
                                <header className="mb-8 text-center">
                                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-900/40">
                                        <LayoutDashboard
                                            className="h-7 w-7 text-white"
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                        Create Account
                                    </h1>

                                    <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                                        Register to access the Task Management Portal.
                                    </p>
                                </header>

                                <form
                                    onSubmit={handleSubmit}
                                    className="mx-auto max-w-xl space-y-5"
                                    noValidate
                                >
                                    {/* Name */}
                                    <div>
                                        <label
                                            htmlFor="name"
                                            className="mb-2 block text-sm font-medium text-slate-200"
                                        >
                                            Full Name
                                        </label>

                                        <div className="relative">
                                            <User
                                                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                                aria-hidden="true"
                                            />

                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                autoComplete="name"
                                                value={name}
                                                onChange={(event) =>
                                                    setName(event.target.value)
                                                }
                                                placeholder="Enter your name"
                                                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 sm:text-base"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="mb-2 block text-sm font-medium text-slate-200"
                                        >
                                            Email Address
                                        </label>

                                        <div className="relative">
                                            <Mail
                                                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                                aria-hidden="true"
                                            />

                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                value={email}
                                                onChange={(event) =>
                                                    setEmail(event.target.value)
                                                }
                                                placeholder="you@example.com"
                                                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 sm:text-base"
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label
                                            htmlFor="password"
                                            className="mb-2 block text-sm font-medium text-slate-200"
                                        >
                                            Password
                                        </label>

                                        <div className="relative">
                                            <Lock
                                                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                                aria-hidden="true"
                                            />

                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                value={password}
                                                onChange={(event) =>
                                                    setPassword(event.target.value)
                                                }
                                                placeholder="Create a password"
                                                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-12 text-sm text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 sm:text-base"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword((prev) => !prev)
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                                                aria-label={
                                                    showPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label
                                            htmlFor="confirmPassword"
                                            className="mb-2 block text-sm font-medium text-slate-200"
                                        >
                                            Confirm Password
                                        </label>

                                        <div className="relative">
                                            <Lock
                                                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                                aria-hidden="true"
                                            />

                                            <input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type={
                                                    showConfirmPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                autoComplete="new-password"
                                                value={confirmPassword}
                                                onChange={(event) =>
                                                    setConfirmPassword(event.target.value)
                                                }
                                                placeholder="Confirm your password"
                                                className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-12 text-sm text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 sm:text-base"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        (prev) => !prev
                                                    )
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                                                aria-label={
                                                    showConfirmPassword
                                                        ? "Hide password"
                                                        : "Show password"
                                                }
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Register */}
                                    <button
                                        type="submit"
                                        disabled={isDisabled}
                                        aria-busy={isLoading}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 hover:shadow-xl hover:shadow-indigo-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:text-base"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Creating Account...
                                            </>
                                        ) : (
                                            "Create Account"
                                        )}
                                    </button>

                                    {/* Login */}
                                    <button
                                        type="button"
                                        onClick={() => router.push("/login")}
                                        className="mx-auto block text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
                                    >
                                        Already have an account? Login
                                    </button>
                                </form>
                            </div>

                            {/* Information */}
                            <aside className="w-full">
                                <section className="mt-8 w-full rounded-2xl border border-white/15 bg-white/5 p-7">
                                    <h2 className="mb-4 text-center text-lg font-bold uppercase tracking-wider text-indigo-200">
                                        User Account
                                    </h2>

                                    <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
                                        <div className="mb-2 flex items-center gap-2">
                                            <User
                                                className="h-4 w-4 text-blue-300"
                                                aria-hidden="true"
                                            />

                                            <h3 className="text-lg font-bold text-white">
                                                User
                                            </h3>
                                        </div>

                                        <ul className="space-y-1.5 text-sm text-slate-300">
                                            <li>• Access your assigned tasks</li>
                                            <li>• Track task progress</li>
                                            <li>• Manage your profile</li>
                                            <li>• Secure account access</li>
                                        </ul>
                                    </div>

                                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                                        <Shield
                                            className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300"
                                            aria-hidden="true"
                                        />

                                        <p className="text-xs leading-relaxed text-slate-300">
                                            Your account will be registered as a
                                            standard user account.
                                        </p>
                                    </div>
                                </section>
                            </aside>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative z-10 bg-slate-950/80 px-4 py-4 text-center backdrop-blur-sm sm:px-6">
                    <p className="text-xs font-large leading-relaxed tracking-wide text-slate-400 sm:text-lg">
                        © 2026 CRUD Auth Task Management Portal.
                        <br className="sm:hidden" /> All Rights Reserved.
                    </p>
                </footer>
                {showOtpModal && (
                    <RegisterOtpModal
                        email={email.trim()}
                        onClose={() => setShowOtpModal(false)}
                        onSuccess={() => {
                            setShowOtpModal(false);
                            router.push("/login");
                        }}
                    />
                )}
            </div>
        </>
    );
}