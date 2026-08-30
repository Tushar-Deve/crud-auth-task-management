"use client";

import { useEffect, useState } from "react";
import { KeyRound, Mail, Pencil, Shield, User } from "lucide-react";
import { useSelector } from "react-redux";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import { changePassword, getProfile } from "@/services/authService";

export default function AdminProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  const token = useSelector((state: any) => state.auth.token);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setProfileError("Failed to load profile");
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const response = await getProfile(token);
        const profileUser = response?.user || response?.data || response;

        if (profileUser) {
          setProfileData(profileUser);
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

    fetchProfile();
  }, [token]);

  const profileName = profileData?.name || "User";
  const profileEmail = profileData?.email || "N/A";
  const profileRole = profileData?.role === "admin"
    ? "Administrator"
    : profileData?.role === "user"
      ? "User"
      : profileData?.role || "User";

  const profileInitials = profileName
    ? profileName
        .split(" ")
        .filter(Boolean)
        .map((word: string) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setChangePasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError("New password and confirmation password do not match.");
      return;
    }

    if (!token) {
      setChangePasswordError("You must be logged in to change your password.");
      return;
    }

    setChangePasswordLoading(true);

    try {
      await changePassword(token, oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordSuccess("Password changed successfully.");

      window.setTimeout(() => {
        setShowChangePasswordForm(false);
        setChangePasswordSuccess("");
      }, 1500);
    } catch (error: unknown) {
      const backendMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Failed to change password. Please try again.";

      setChangePasswordError(
        backendMessage
      );
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleCancelChangePassword = () => {
    setShowChangePasswordForm(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordError("");
    setChangePasswordSuccess("");
  };

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
          title="Profile"
          subtitle="Overview of your account"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Profile
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Current logged-in user
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
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

              {!profileLoading && !profileError && profileData && (
                <>
                  <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
                    {profileInitials}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {profileName}
                      </h2>

                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Shield className="h-3 w-3" aria-hidden="true" />
                        {profileRole}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          <Mail className="h-4 w-4" aria-hidden="true" />
                          Email
                        </div>
                        <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {profileEmail}
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          <User className="h-4 w-4" aria-hidden="true" />
                          Role
                        </div>
                        <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {profileRole}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePasswordForm(true);
                          setChangePasswordError("");
                          setChangePasswordSuccess("");
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                        Change Password
                      </button>
                    </div>
                  </div>
                  </div>

                  {showChangePasswordForm && (
                    <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <KeyRound className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Change Password
                          </h2>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Choose a strong new password to keep your account secure.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleChangePassword} className="mt-6 max-w-xl space-y-4">
                        <div>
                          <label htmlFor="old-password" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            Old Password
                          </label>
                          <input
                            id="old-password"
                            name="oldPassword"
                            type="password"
                            autoComplete="current-password"
                            value={oldPassword}
                            onChange={(event) => setOldPassword(event.target.value)}
                            disabled={changePasswordLoading}
                            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                          />
                        </div>

                        <div>
                          <label htmlFor="new-password" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            New Password
                          </label>
                          <input
                            id="new-password"
                            name="newPassword"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            disabled={changePasswordLoading}
                            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                          />
                        </div>

                        <div>
                          <label htmlFor="confirm-password" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            Confirm New Password
                          </label>
                          <input
                            id="confirm-password"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            disabled={changePasswordLoading}
                            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                          />
                        </div>

                        {changePasswordError && (
                          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            {changePasswordError}
                          </div>
                        )}

                        {changePasswordSuccess && (
                          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                            {changePasswordSuccess}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={changePasswordLoading}
                            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-zinc-950"
                          >
                            {changePasswordLoading ? "Changing Password..." : "Change Password"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelChangePassword}
                            disabled={changePasswordLoading}
                            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </section>
                  )}
                </>
              )}

              {!profileLoading && !profileError && !profileData && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                  No profile data found.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
