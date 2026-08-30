"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Mail,
  User,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";

import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import { getTaskById } from "@/services/user/userTaskService";

interface TaskDetails {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string;
  created_at: string;

  assigned_by_id: number;
  assigned_by_name: string;
  assigned_by_email: string;

  assigned_to_id: number;
  assigned_to_name: string;
  assigned_to_email: string;
}

export default function TaskDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const taskId = params.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = useSelector(
    (state: { auth: { token: string | null } }) => state.auth.token
  );

  useEffect(() => {
    const fetchTaskDetails = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }

      if (!taskId) {
        setError("Task ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getTaskById(taskId);

        if (response?.success && response?.task) {
          setTask(response.task);
        } else {
          setError(response?.message || "Task details not found.");
        }
      } catch (error) {
        setError("Failed to load task details.");
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
  }, [token, taskId]);

  const handleClose = () => {
    router.push("/user/tasks");
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const priorityClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300";

      case "medium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";

      case "low":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";

      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  const statusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";

      case "pending":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";

      case "in progress":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";

      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

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
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title="Task Details"
          subtitle="View your assigned task information"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push("/user/tasks")}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to My Tasks
              </button>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close task details"
                title="Close"
                className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Loading task details...
                </p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-white px-6 py-14 text-center shadow-sm dark:border-red-900/50 dark:bg-zinc-950">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  Back to My Tasks
                </button>
              </div>
            )}

            {/* Task Details */}
            {!loading && !error && task && (
              <div className="space-y-6">
                {/* Main Task Card */}
                <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="border-b border-zinc-200 px-5 py-5 sm:px-6 dark:border-zinc-800">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Task #{task.id}
                        </p>

                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                          {task.title}
                        </h1>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${priorityClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>

                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-6 sm:px-6">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Description
                      </h2>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {task.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                          <CalendarDays className="h-4 w-4" />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            Due Date
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {formatDate(task.due_date)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            Created
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {formatDate(task.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* People */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Assigned User */}
                  <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="border-b border-zinc-200 px-5 py-4 sm:px-6 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                          <User className="h-5 w-5" />
                        </div>

                        <div>
                          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Assigned User
                          </h2>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            User assigned to this task
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-5 sm:px-6">
                      <div>
                        <p className="text-xs font-medium text-zinc-400">
                          User ID
                        </p>

                        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {task.assigned_to_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-zinc-400">
                          Name
                        </p>

                        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {task.assigned_to_name}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-zinc-400">
                          Email
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-zinc-400" />

                          <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {task.assigned_to_email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Assigned By */}
                  <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="border-b border-zinc-200 px-5 py-4 sm:px-6 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                          <User className="h-5 w-5" />
                        </div>

                        <div>
                          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Assigned By
                          </h2>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Person who assigned this task
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-5 sm:px-6">
                      <div>
                        <p className="text-xs font-medium text-zinc-400">
                          User ID
                        </p>

                        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {task.assigned_by_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-zinc-400">
                          Name
                        </p>

                        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {task.assigned_by_name}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-zinc-400">
                          Email
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-zinc-400" />

                          <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {task.assigned_by_email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}