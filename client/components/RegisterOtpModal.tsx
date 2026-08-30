"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { verifyRegisterOtp } from "@/services/authService";

interface RegisterOtpModalProps {
    email: string;
    onSuccess: () => void;
    onClose: () => void;
}

export default function RegisterOtpModal({
    email,
    onSuccess,
    onClose,
}: RegisterOtpModalProps) {

    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);

    // --------------------
    // OTP Timer
    // --------------------

    useEffect(() => {
        if (timeLeft <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // --------------------
    // Verify OTP
    // --------------------

    const handleVerifyOtp = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!otp.trim()) {
            toast.error("Please enter OTP");
            return;
        }

        if (otp.length !== 6) {
            toast.error("OTP must be 6 digits");
            return;
        }

        if (timeLeft <= 0) {
            toast.error("OTP expired. Please register again.");
            return;
        }

        try {
            setIsLoading(true);

            const response = await verifyRegisterOtp(
                email,
                otp.trim()
            );

            toast.success(
                response.message ||
                "Email verified successfully"
            );

            onSuccess();

        } catch (error: unknown) {

            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message ||
                    "OTP verification failed"
                );
                return;
            }

            console.error(error);
            toast.error("Unexpected error");

        } finally {
            setIsLoading(false);
        }
    };

    // --------------------
    // OTP Input
    // --------------------

    const handleOtpChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = event.target.value
            .replace(/\D/g, "")
            .slice(0, 6);

        setOtp(value);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="otp-title"
        >

            {/* Modal */}
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl">

                {/* Decorative glow */}
                <div
                    className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl"
                    aria-hidden="true"
                />

                <div
                    className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl"
                    aria-hidden="true"
                />

                {/* Close */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute right-4 top-4 z-10 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close OTP verification"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="relative px-6 py-8 sm:px-8">

                    {/* Icon */}
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-900/40">
                        <ShieldCheck
                            className="h-7 w-7 text-white"
                            aria-hidden="true"
                        />
                    </div>

                    {/* Heading */}
                    <div className="text-center">

                        <h2
                            id="otp-title"
                            className="text-2xl font-bold tracking-tight text-white"
                        >
                            Verify Your Email
                        </h2>

                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            Enter the 6-digit OTP sent to your email.
                        </p>

                    </div>

                    {/* Email */}
                    <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                        <Mail
                            className="h-4 w-4 shrink-0 text-indigo-300"
                            aria-hidden="true"
                        />

                        <p className="min-w-0 truncate text-sm font-medium text-slate-200">
                            {email}
                        </p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleVerifyOtp}
                        className="mt-6 space-y-5"
                    >

                        {/* OTP */}
                        <div>

                            <label
                                htmlFor="register-otp"
                                className="mb-2 block text-sm font-medium text-slate-200"
                            >
                                Enter OTP
                            </label>

                            <input
                                id="register-otp"
                                name="otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={handleOtpChange}
                                placeholder="Enter 6-digit OTP"
                                autoFocus
                                disabled={isLoading}
                                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-center text-xl font-semibold tracking-[0.5em] text-white placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                        </div>

                        {/* Timer */}
                        <div className="text-center">

                            {timeLeft > 0 ? (
                                <p className="text-sm text-slate-400">
                                    OTP expires in{" "}
                                    <span className="font-semibold text-indigo-300">
                                        00:{String(timeLeft).padStart(2, "0")}
                                    </span>
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-red-400">
                                    OTP has expired
                                </p>
                            )}

                        </div>

                        {/* Verify */}
                        <button
                            type="submit"
                            disabled={
                                isLoading ||
                                otp.length !== 6 ||
                                timeLeft <= 0
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 hover:shadow-xl hover:shadow-indigo-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                        >

                            {isLoading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Verify Email"
                            )}

                        </button>

                    </form>

                    {/* Information */}
                    <div className="mt-5 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">

                        <p className="text-center text-xs leading-relaxed text-slate-300">
                            Check your inbox and spam folder if you don't
                            see the OTP email. The OTP is valid for 1 minute.
                        </p>

                    </div>

                </div>

            </div>
        </div>
    );
}

