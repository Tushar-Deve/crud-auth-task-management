"use client";

import { CalendarDays, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import Pagination from "@/components/reusable/pagination";
import { getTaskHistory,markTaskHistoryAsRead, } from "@/services/taskService";

type TaskHistory = {
  id: number;
  taskId: number;
  updatedBy: number;
  userName: string;
  userEmail?: string;
  task: string;
  status: "completed";
  updatedAt: string;
};

export default function TaskHistoryPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [searchValue, setSearchValue] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [completedDate, setCompletedDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [taskHistoryData, setTaskHistoryData] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tasksPerPage = 5;

  const goToTaskManagement = () => {
    router.push("/admin/tasks");
  };

  // -------------------------
  // Get Task History
  // -------------------------

  useEffect(() => {
  const fetchTaskHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTaskHistory();

      setTaskHistoryData(response.history || []);

      // Task History page open ho gaya,
      // isliye unread notifications ko read mark karo.
      await markTaskHistoryAsRead();

      // Sidebar ko immediately notification update karne ke liye event
      window.dispatchEvent(
        new Event("admin-task-notification-updated")
      );

    } catch (error) {
      console.error("Failed to load task history:", error);

      setError("Failed to load task history");
      setTaskHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  fetchTaskHistory();
}, []);

  // -------------------------
  // Unique Users
  // -------------------------

  const users = useMemo(() => {
    const uniqueUsers = new Map<number, string>();

    taskHistoryData.forEach((task) => {
      if (!uniqueUsers.has(task.updatedBy)) {
        uniqueUsers.set(task.updatedBy, task.userName);
      }
    });

    return Array.from(uniqueUsers.entries());
  }, [taskHistoryData]);

  // -------------------------
  // Filter Task History
  // -------------------------

  const filteredTasks = useMemo(() => {
    return taskHistoryData.filter((task) => {
      
      const search = searchValue.toLowerCase().trim();

      const matchesSearch =
        !search ||
        task.userName.toLowerCase().includes(search) ||
        task.task.toLowerCase().includes(search);

      // User filter
      const matchesUser =
        userFilter === "all" ||
        String(task.updatedBy) === userFilter;

      // Completed date filter
      const matchesDate =
        !completedDate ||
        new Date(task.updatedAt).toISOString().split("T")[0] ===
          completedDate;

      return matchesSearch && matchesUser && matchesDate;
    });
  }, [
    taskHistoryData,
    searchValue,
    userFilter,
    completedDate,
  ]);

  // -------------------------
  // Pagination
  // -------------------------

  const totalPages = Math.ceil(
    filteredTasks.length / tasksPerPage
  );

  const startIndex = (currentPage - 1) * tasksPerPage;

  const visibleTasks = filteredTasks.slice(
    startIndex,
    startIndex + tasksPerPage
  );

  // -------------------------
  // Reset page if filter
  // leaves current page invalid
  // -------------------------

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }

    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* Sidebar */}
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

        {/* Navbar */}
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title="Task History"
          subtitle="View and track completed tasks"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">

          {/* Main Card */}
          <section className="mx-auto w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-5 sm:px-6 dark:border-zinc-800">

              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                  Completed Task History
                </h2>

                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  View completed tasks and their completion details.
                </p>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={goToTaskManagement}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                aria-label="Close task history"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* Filters */}
            <div className="border-b border-zinc-200 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/30">

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

                {/* Search */}
                <div className="relative w-full lg:max-w-xl">

                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />

                  <input
                    type="search"
                    value={searchValue}
                    onChange={(event) => {
                      setSearchValue(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search user or task..."
                    aria-label="Search user or task"
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-600"
                  />

                </div>

                {/* User Filter */}
                <select
                  value={userFilter}
                  onChange={(event) => {
                    setUserFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by user"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-indigo-600 lg:w-52"
                >
                  <option value="all">All Users</option>

                  {users.map(([userId, userName]) => (
                    <option
                      key={userId}
                      value={String(userId)}
                    >
                      {userName}
                    </option>
                  ))}
                </select>

                {/* Completed Date */}
                <div className="relative w-full lg:w-52">

                  <CalendarDays
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />

                  <input
                    type="date"
                    value={completedDate}
                    onChange={(event) => {
                      setCompletedDate(event.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter by completed date"
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-zinc-700 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-indigo-600"
                  />

                </div>

              </div>

            </div>

            {/* Table */}
            <div className="overflow-x-auto">

              <table className="w-full min-w-[850px] text-left">

                <thead className="bg-zinc-50 dark:bg-zinc-900/60">

                  <tr className="border-b border-zinc-200 dark:border-zinc-800">

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
                      User ID
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
                      User Name
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
                      Task
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
                      Completed Date
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">

                  {loading ? (

                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                      >
                        Loading task history...
                      </td>
                    </tr>

                  ) : error ? (

                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-red-500"
                      >
                        {error}
                      </td>
                    </tr>

                  ) : (

                    visibleTasks.map((task) => (

                      <tr
                        key={task.id}
                        className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                      >

                        {/* User ID */}
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-zinc-900 sm:px-6 dark:text-zinc-50">
                          #{task.updatedBy}
                        </td>

                        {/* User Name */}
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-600 sm:px-6 dark:text-zinc-300">
                          {task.userName}
                        </td>

                        {/* Task */}
                        <td className="px-5 py-4 text-sm font-medium text-zinc-900 sm:px-6 dark:text-zinc-50">
                          {task.task}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 sm:px-6">

                          <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Completed
                          </span>

                        </td>

                        {/* Completed Date */}
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-600 sm:px-6 dark:text-zinc-300">
                          {new Date(task.updatedAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

            {/* Empty state */}
            {!loading &&
              !error &&
              visibleTasks.length === 0 && (
                <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No completed tasks found.
                </div>
              )}

          </section>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

        </main>

      </div>

    </div>
  );
}