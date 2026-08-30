"use client";

import { Bell, Menu, Search, Shield, X } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { getProfile } from "@/services/authService";

export interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}

export default function Navbar({
  onMenuClick,
  title = "Dashboard",
  subtitle = "Overview of your portal activity",
}: NavbarProps) {

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const user = useSelector((state: any) => state.auth.user);
  const token = useSelector((state: any) => state.auth.token);

  const userRole = user?.role === "admin" ? "Administrator" : user?.role === "user" ? "User" : user?.role || "User";
  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((word: string) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const createdAt = user?.createdAt || user?.created_at || user?.createdAt || "";

  const formatCreatedAt = (value: string) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const profileName = profileData?.name || user?.name || "User";
  const profileEmail = profileData?.email || user?.email || "N/A";
  const profileId = profileData?.id ?? user?.id ?? "N/A";
  const profileRole = profileData?.role === "admin" ? "Administrator" : profileData?.role === "user" ? "User" : userRole;
  const profileCreatedAt = profileData?.createdAt || profileData?.created_at || user?.createdAt || user?.created_at || "";

  const profileInitials = profileName
    ? profileName
        .split(" ")
        .filter(Boolean)
        .map((word: string) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const handleOpenProfile = async () => {
    setProfileOpen(true);
    setProfileError("");
    setProfileLoading(true);

    try {
      if (!token) {
        setProfileError("Failed to load profile");
        setProfileLoading(false);
        return;
      }

      const response = await getProfile(token);
      const profileUser = response?.user || response?.data || null;

      if (profileUser) {
        setProfileData({
          id: profileUser.id,
          name: profileUser.name,
          email: profileUser.email,
          role: profileUser.role,
          createdAt: profileUser.createdAt || profileUser.created_at || profileUser.createdAt,
        });
      } else {
        setProfileData(null);
      }
    } catch (error) {
      setProfileError("Failed to load profile");
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

          <div className="flex min-w-0 flex-1 items-center gap-4">
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                {title}
              </h1>

              <p className="hidden text-xs text-zinc-500 sm:block dark:text-zinc-400">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">

            {/* Search */}
            <div className="relative hidden sm:block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />

              <input
                type="search"
                placeholder="Search..."
                aria-label="Search dashboard"
                className="w-48 rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 lg:w-64 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
              />
            </div>

            {/* Notifications */}
            <button
              type="button"
              className="relative rounded-xl border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />

              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-zinc-950" />
            </button>

            {/* User profile */}
            <button
              type="button"
              onClick={handleOpenProfile}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 py-1.5 pl-1.5 pr-3 text-left transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-zinc-700 dark:hover:bg-zinc-900"
              aria-label="Open profile details"
            >

              {/* Initials */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white">
                {initials}
              </div>

              <div className="hidden min-w-0 md:block">

                {/* Name */}
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {user?.name}
                </p>

                {/* Role */}
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                  {userRole}
                </span>

              </div>
            </button>

          </div>
        </div>
      </header>

      {profileOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Profile
              </h2>

              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                aria-label="Close profile"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col items-center justify-center gap-3 pb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
                  {profileInitials}
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {profileName}
                  </h3>

                  <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <Shield className="h-3 w-3" aria-hidden="true" />
                    {profileRole}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {profileLoading && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                    Loading profile...
                  </div>
                )}

                {profileError && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                    {profileError}
                  </div>
                )}

                {!profileLoading && !profileError && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Name
                        </div>
                        <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {profileName}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Email
                        </div>
                        <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {profileEmail}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          User ID
                        </div>
                        <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {profileId}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Role
                        </div>
                        <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {profileRole}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          Account Created
                        </div>
                        <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {formatCreatedAt(profileCreatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}