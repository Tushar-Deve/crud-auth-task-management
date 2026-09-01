"use client";
import axios from "axios";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/redux/slices/authSlice";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser, forgotPassword } from "@/services/authService";
import Footer from "@/components/reusable/footer/Footer";
import {
  Eye,
  EyeOff,
  LayoutDashboard,
  Loader2,
  Mail,
  Lock,
  Shield,
  User,
} from "lucide-react";

// Replace with a local image when ready, e.g. "/images/hero-workspace.jpg"
const BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80";



export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const dispatch = useDispatch();
  const router = useRouter();

  const isDisabled =
    !email.trim() || (!isForgotPassword && !password.trim()) || isLoading;

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const response = await loginUser({
        email: email.trim(),
        password: password.trim(),
      });

      dispatch(
        loginSuccess({
          user: response.user,
          token: response.accessToken,
        })
      );

      toast.success("Login successful");

      if (response.user?.role === "admin") {
        router.push("/admin/dashboard");
      } else if (response.user?.role === "user") {
        router.push("/user/dashboard");
      } else {
        toast.error("Invalid user role");
      }

    } catch (error: unknown) {

      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Login failed"
        );
        return;
      }

      console.error(error);
      toast.error("Unexpected error");

    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    try {
      setIsLoading(true);

      const response = await forgotPassword(email.trim());

      toast.success(
        response.message || "Reset link sent if email exists"
      );

    } catch (error: unknown) {

      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
          "Failed to send reset link"
        );
        return;
      }

      console.error(error);
      toast.error("Unexpected error");

    } finally {
      setIsLoading(false);
    }
  };

  return (<>{/* Page-level fade-in animation */}
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
      {/* Background layer — matches Welcome Page theme */}
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

      {/* Main content — centered login card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up w-full max-w-5xl">
          <div className="grid gap-8 rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl lg:grid-cols-[1.6fr_1fr] sm:p-10">
            {/* Header — logo, heading, subheading */}
            <div>
              <header className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-900/40">
                  <LayoutDashboard
                    className="h-7 w-7 text-white"
                    aria-hidden="true"
                  />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {isForgotPassword ? "Forgot Password?" : "Welcome"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                  {isForgotPassword
                    ? "Enter your email address and we'll send you a reset link."
                    : "Loginto continue to the CRUD Auth Task Management Portal."}
                </p>
              </header>

              {/* Login form — email, password, submit */}
              <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="mx-auto max-w-xl space-y-5" noValidate>
                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Email address
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
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your Email"
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 sm:text-base"
                    />
                  </div>
                </div>

                {!isForgotPassword && (
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
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-12 text-sm text-white placeholder:text-slate-400 outline-none transition-all focus:border-indigo-400/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/30 sm:text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Login button — gradient, hover, disabled, loading */}
                <button
                  type="submit"
                  disabled={isDisabled}
                  aria-busy={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 hover:shadow-xl hover:shadow-indigo-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        aria-hidden="true"
                      />
                      {isForgotPassword ? "Sending reset link..." : "Signing in..."}
                    </>
                  ) : (
                    isForgotPassword ? "Send Reset Link" : "Login To Dashboard"
                  )}
                </button>
                {isForgotPassword ? (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="mx-auto block text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
                  >
                    ← Back to Login
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="mx-auto block text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
                  >
                    Forgot Password?
                  </button>
                )}
                {!isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="mx-auto block text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
                  >
                    Don't have an account? Register
                  </button>
                )}
              </form>
            </div>

            <aside className="hidden w-full lg:block">
              {/* Role information card */}
              <section
                aria-labelledby="role-info-heading"
                className="w-full rounded-2xl border border-white/15 bg-white/5 p-7 mt-8"
              >
                <h2
                  id="role-info-heading"
                  className="mb-4 text-center text-lg font-bold uppercase tracking-wider text-indigo-200"
                >
                  Role Information
                </h2>

                <div className="space-y-5">
                  {/* Admin role */}
                  <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Shield
                        className="h-4 w-4 text-indigo-300"
                        aria-hidden="true"
                      />
                      <h3 className="text-lg font-bold text-white">
                        Admin
                      </h3>
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-300">
                      <li>• Can manage users</li>
                      <li>• Can assign tasks</li>
                      <li>• Can monitor all tasks</li>
                    </ul>
                  </div>

                  {/* User role */}
                  <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <User
                        className="h-4 w-4 text-blue-300"
                        aria-hidden="true"
                      />
                      <h3 className="text-lg font-bold text-white">User</h3>
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-300">
                      <li>• Can view assigned tasks</li>
                      <li>• Can update task status</li>
                      <li>• Can manage own profile</li>
                    </ul>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main >

      <Footer />
    </div >
  </>
  );
}
