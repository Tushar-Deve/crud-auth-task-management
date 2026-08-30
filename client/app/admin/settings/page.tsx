"use client";

import { useState } from "react";
import {
  Bell,
  Mail,
  Palette,
  Shield,
  User,
} from "lucide-react";
import { useSelector } from "react-redux";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import { useTheme } from "@/components/ThemeProvider";

type ThemePreference = "light" | "dark" | "system";

const themeOptions: {
  label: string;
  value: ThemePreference;
}[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const user = useSelector(
    (state: {
      auth: {
        user?: {
          name?: string;
          email?: string;
          role?: string;
        };
      };
    }) => state.auth.user
  );

  const [taskNotifications, setTaskNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const { theme, setTheme } = useTheme();

  const profileName = user?.name || "User";
  const profileEmail = user?.email || "N/A";

  const profileRole =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "user"
        ? "User"
        : user?.role || "User";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role="admin"
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title="Settings"
          subtitle="Manage your account preferences"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-2">

            {/* ACCOUNT SETTINGS */}

            <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <User
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Account Settings
                  </h1>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Personal details
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Name */}

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      <User
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      Name
                    </div>

                    <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {profileName}
                    </div>
                  </div>

                  {/* Email */}

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      <Mail
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      Email
                    </div>

                    <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {profileEmail}
                    </div>
                  </div>

                  {/* Role */}

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:col-span-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      <Shield
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      Role
                    </div>

                    <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {profileRole}
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* APPEARANCE */}

            <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Palette
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Appearance
                  </h1>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Theme preferences
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  {themeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <input
                        type="radio"
                        name="admin-theme"
                        value={option.value}
                        checked={theme === option.value}
                        onChange={() =>
                          setTheme(option.value)
                        }
                        className="h-4 w-4 rounded-full border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                      />

                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* NOTIFICATIONS */}

            <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <Bell
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Notifications
                  </h1>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Delivery preferences
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">

                  {/* Task Notifications */}

                  <label className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <span className="flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      <Bell
                        className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
                        aria-hidden="true"
                      />

                      Task notifications
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setTaskNotifications(
                          (current) => !current
                        )
                      }
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        taskNotifications
                          ? "bg-indigo-600"
                          : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                      aria-label="Toggle task notifications"
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          taskNotifications
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </label>

                  {/* Email Notifications */}

                  <label className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <span className="flex items-center gap-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      <Mail
                        className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
                        aria-hidden="true"
                      />

                      Email notifications
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setEmailNotifications(
                          (current) => !current
                        )
                      }
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        emailNotifications
                          ? "bg-indigo-600"
                          : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                      aria-label="Toggle email notifications"
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          emailNotifications
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </label>

                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}