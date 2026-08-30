"use client";

import axios from "axios";
import { Eye, EyeOff, LayoutDashboard, Loader2, Lock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { resetPassword } from "@/services/authService";

const BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPassword.trim()) {
      toast.error("Please enter your new password");
      return;
    }

    if (!confirmPassword.trim()) {
      toast.error("Please confirm your new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!token || isLoading) {
      toast.error("Invalid or expired token");
      return;
    }

    try {
      setIsLoading(true);

      await resetPassword(token, newPassword);

      toast.success("Password reset successful");
      router.push("/login");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Unable to reset password"
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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.75s ease-out both; }
      `}</style>

      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}
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

        <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="animate-fade-in-up w-full max-w-lg">
            <section className="rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl sm:p-10">
              <header className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-900/40">
                  <LayoutDashboard className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold tracking-wide text-indigo-200 sm:text-base">
                  CRUD Auth Task Management Portal
                </p>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Reset Password
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Enter your new password below to reset your account password.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <PasswordField
                  id="new-password"
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  showPassword={showNewPassword}
                  onToggleVisibility={() => setShowNewPassword((visible) => !visible)}
                  autoComplete="new-password"
                />
                <PasswordField
                  id="confirm-password"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  showPassword={showConfirmPassword}
                  onToggleVisibility={() => setShowConfirmPassword((visible) => !visible)}
                  autoComplete="new-password"
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 hover:shadow-xl hover:shadow-indigo-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      Resetting password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </section>
          </div>
        </main>

        <footer className="relative z-10 bg-slate-950/80 px-4 py-4 text-center backdrop-blur-sm sm:px-6">
          <p className="text-xs leading-relaxed tracking-wide text-slate-400 sm:text-sm">
            © 2026 CRUD Auth Task Management Portal. All Rights Reserved.
          </p>
        </footer>
      </div>
    </>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  autoComplete: "new-password";
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label === "New Password" ? "Enter your new password" : "Confirm your new password"}
          className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-12 text-sm text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 sm:text-base"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
