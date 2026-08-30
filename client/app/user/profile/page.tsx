"use client";

import { KeyRound, Mail, Pencil, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import { getProfile } from "@/services/authService";
import type { RootState } from "@/redux/store";

interface ProfileData {
  id?: number | string;
  name?: string;
  email?: string;
  role?: string;
  accountId?: string;
  memberSince?: string;
  createdAt?: string;
  created_at?: string;
}

export default function UserProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [showChangePassword, setShowChangePassword] = useState(false);

  const token = useSelector(
    (state: RootState) => state.auth.token
  );

  // --------------------------------------------------
  // Fetch current logged-in user profile
  // --------------------------------------------------

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setProfileError("Authentication token not found.");
        return;
      }

      try {
        setProfileLoading(true);
        setProfileError("");

        const response = await getProfile(token);

        const user =
          response?.user ||
          response?.data ||
          response;

        if (user) {
          setProfileData(user);
        } else {
          setProfileData(null);
          setProfileError("No profile data found.");
        }
      } catch (error) {
        console.error("Failed to load profile:", error);

        setProfileData(null);
        setProfileError("Failed to load profile.");
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // --------------------------------------------------
  // Profile values
  // --------------------------------------------------

  const profileName = profileData?.name || "User";

  const profileEmail = profileData?.email || "N/A";

  const profileRole =
    profileData?.role === "admin"
      ? "Administrator"
      : profileData?.role === "user"
        ? "User"
        : profileData?.role || "User";

  // --------------------------------------------------
  // Initials
  // --------------------------------------------------

  const initials = profileName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // --------------------------------------------------
  // Account information
  // --------------------------------------------------

  const accountId =
    profileData?.accountId ||
    profileData?.id ||
    "N/A";

  const memberSince =
    profileData?.memberSince ||
    profileData?.createdAt ||
    profileData?.created_at ||
    "N/A";

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* Sidebar */}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role="user"
      />

      {/* Main Content */}

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed
            ? "lg:pl-16"
            : "lg:pl-64"
        }`}
      >

        {/* Navbar */}

        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title="My Profile"
          subtitle="Manage your account information"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">

          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

            {/* Header */}

            <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">

              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Profile
              </h1>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Current logged-in user
              </p>

            </div>

            <div className="p-6">

              {/* Loading */}

              {profileLoading && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                  Loading profile...
                </div>
              )}

              {/* Error */}

              {profileError && !profileLoading && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  {profileError}
                </div>
              )}

              {/* Profile */}

              {!profileLoading &&
                !profileError &&
                profileData && (
                  <>

                    {/* Profile Top Section */}

                    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">

                      {/* Initials */}

                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
                        {initials}
                      </div>

                      {/* User Information */}

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-3">

                          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {profileName}
                          </h2>

                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">

                            <Shield
                              className="h-3 w-3"
                              aria-hidden="true"
                            />

                            {profileRole}

                          </span>

                        </div>

                        {/* Email + Role */}

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">

                          <InfoCard
                            icon={Mail}
                            label="Email"
                            value={profileEmail}
                          />

                          <InfoCard
                            icon={User}
                            label="Role"
                            value={profileRole}
                          />

                        </div>

                        {/* Buttons */}

                        <div className="mt-6 flex flex-wrap gap-3">

                          {/* Edit Profile - Disabled */}

                          <button
                            type="button"
                            disabled
                            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-500 opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                          >
                            <Pencil
                              className="h-4 w-4"
                              aria-hidden="true"
                            />

                            Edit Profile
                          </button>

                          {/* Change Password */}

                          <button
                            type="button"
                            onClick={() =>
                              setShowChangePassword(true)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <KeyRound
                              className="h-4 w-4"
                              aria-hidden="true"
                            />

                            Change Password
                          </button>

                        </div>

                      </div>

                    </div>

                    {/* Account Information */}

                    <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950/40">

                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Account Information
                      </h2>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">

                        <AccountItem
                          label="Account ID"
                          value={String(accountId)}
                        />

                        <AccountItem
                          label="Member Since"
                          value={String(memberSince)}
                        />

                      </div>

                    </section>

                    {/* Change Password */}

                    {showChangePassword && (
                      <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950/40">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">

                            <KeyRound
                              className="h-5 w-5"
                              aria-hidden="true"
                            />

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

                        {/* Password Form - Functionality Later */}

                        <form
                          onSubmit={(event) =>
                            event.preventDefault()
                          }
                          className="mt-6 max-w-xl space-y-4"
                        >

                          <Field
                            id="current-password"
                            label="Current Password"
                            type="password"
                          />

                          <Field
                            id="new-password"
                            label="New Password"
                            type="password"
                          />

                          <Field
                            id="confirm-password"
                            label="Confirm New Password"
                            type="password"
                          />

                          <div className="flex flex-wrap gap-3 pt-2">

                            <button
                              type="submit"
                              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                            >
                              Change Password
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setShowChangePassword(false)
                              }
                              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              Cancel
                            </button>

                          </div>

                        </form>

                      </section>
                    )}

                  </>
                )}

              {/* No Profile */}

              {!profileLoading &&
                !profileError &&
                !profileData && (
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


// --------------------------------------------------
// Info Card
// --------------------------------------------------

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">

      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">

        <Icon
          className="h-4 w-4"
          aria-hidden="true"
        />

        {label}

      </div>

      <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {value}
      </div>

    </div>
  );
}


// --------------------------------------------------
// Account Item
// --------------------------------------------------

function AccountItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>

      <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {value}
      </div>

    </div>
  );
}


// --------------------------------------------------
// Password Field
// --------------------------------------------------

function Field({
  id,
  label,
  type,
}: {
  id: string;
  label: string;
  type: string;
}) {
  return (
    <div>

      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        required
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />

    </div>
  );
}