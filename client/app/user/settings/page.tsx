"use client";

import { useState } from "react";
import {
  Bell,
  CheckSquare,
  Eye,
  Mail,
  Palette,
} from "lucide-react";
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

export default function UserSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [taskAssignments, setTaskAssignments] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  const [showCompletedTasks, setShowCompletedTasks] =
    useState(true);

  const [taskReminders, setTaskReminders] = useState(true);

  const [defaultTaskView, setDefaultTaskView] =
    useState("List view");

  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role="user"
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed
            ? "lg:pl-16"
            : "lg:pl-64"
        }`}
      >

        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title="Settings"
          subtitle="Manage your preferences and account settings"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">

          <div className="grid gap-6 xl:grid-cols-2">

            {/* NOTIFICATIONS */}

            <SettingsCard
              icon={Bell}
              iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
              title="Notifications"
              subtitle="Control how you hear about your tasks."
            >
              <div className="space-y-3">

                <SwitchRow
                  icon={CheckSquare}
                  label="Task assignments"
                  description="When a task is assigned to you"
                  enabled={taskAssignments}
                  onToggle={() =>
                    setTaskAssignments(
                      (value) => !value
                    )
                  }
                />

                <SwitchRow
                  icon={Bell}
                  label="Task status updates"
                  description="When work on your tasks is updated"
                  enabled={statusUpdates}
                  onToggle={() =>
                    setStatusUpdates(
                      (value) => !value
                    )
                  }
                />

                <SwitchRow
                  icon={Bell}
                  label="Deadline reminders"
                  description="Before task due dates"
                  enabled={deadlineReminders}
                  onToggle={() =>
                    setDeadlineReminders(
                      (value) => !value
                    )
                  }
                />

                <SwitchRow
                  icon={Mail}
                  label="Email notifications"
                  description="Receive notifications in your inbox"
                  enabled={emailNotifications}
                  onToggle={() =>
                    setEmailNotifications(
                      (value) => !value
                    )
                  }
                />

              </div>
            </SettingsCard>

            {/* APPEARANCE */}

            <SettingsCard
              icon={Palette}
              iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
              title="Appearance"
              subtitle="Choose your preferred theme."
            >
              <div className="grid gap-3 sm:grid-cols-3">

                {themeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <input
                      type="radio"
                      name="user-theme"
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
            </SettingsCard>

            {/* TASK PREFERENCES */}

            <SettingsCard
              icon={CheckSquare}
              iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
              title="Task Preferences"
              subtitle="Set your preferred task workspace defaults."
            >
              <div className="space-y-4">

                {/* Default Task View */}

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">

                  <label
                    htmlFor="default-task-view"
                    className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
                  >
                    Default task view
                  </label>

                  <select
                    id="default-task-view"
                    value={defaultTaskView}
                    onChange={(event) =>
                      setDefaultTaskView(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    <option>List view</option>
                    <option>Board view</option>
                    <option>Compact view</option>
                  </select>

                </div>

                {/* Show Completed Tasks */}

                <SwitchRow
                  icon={Eye}
                  label="Show completed tasks"
                  description="Keep completed work visible in your task list"
                  enabled={showCompletedTasks}
                  onToggle={() =>
                    setShowCompletedTasks(
                      (value) => !value
                    )
                  }
                />

                {/* Task Reminders */}

                <SwitchRow
                  icon={Bell}
                  label="Task reminders"
                  description="Show reminders for upcoming tasks"
                  enabled={taskReminders}
                  onToggle={() =>
                    setTaskReminders(
                      (value) => !value
                    )
                  }
                />

              </div>
            </SettingsCard>

          </div>

        </main>

      </div>

    </div>
  );
}

/* SETTINGS CARD */

function SettingsCard({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  children,
}: {
  icon: typeof Bell;
  iconClassName: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">

      <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon
            className="h-5 w-5"
            aria-hidden="true"
          />
        </div>

        <div>

          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>

        </div>

      </div>

      <div className="p-6">
        {children}
      </div>

    </section>
  );
}

/* SWITCH ROW */

function SwitchRow({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: typeof Bell;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">

      <div className="flex min-w-0 items-center gap-3">

        <Icon
          className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        />

        <div>

          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {label}
          </p>

          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>

        </div>

      </div>

      <button
        type="button"
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        aria-label={`Toggle ${label}`}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
          enabled
            ? "bg-indigo-600"
            : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >

        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
            enabled
              ? "translate-x-6"
              : "translate-x-1"
          }`}
        />

      </button>

    </div>
  );
}