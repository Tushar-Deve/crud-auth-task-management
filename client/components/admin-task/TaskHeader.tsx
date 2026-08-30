"use client";

import { useRouter } from "next/navigation";
import { Plus, Search, History } from "lucide-react";

interface TaskHeaderProps {
  searchValue: string;
  priorityValue: "all" | "low" | "medium" | "high";
  onSearchChange: (value: string) => void;
  onPriorityChange: (
    value: "all" | "low" | "medium" | "high"
  ) => void;
   notificationCount: number;
}

export default function TaskHeader({
  searchValue,
  priorityValue,
  onSearchChange,
  onPriorityChange,
  notificationCount,
}: TaskHeaderProps) {
  const router = useRouter();

  return (
    <section className="border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* Search */}
          <div className="relative w-full max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />

            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search task or user..."
              aria-label="Search tasks or users"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityValue}
            onChange={(e) =>
              onPriorityChange(
                e.target.value as "all" | "low" | "medium" | "high"
              )
            }
            aria-label="Filter tasks by priority"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex items-center gap-3">

          {/* Task History */}
          <button
  type="button"
  onClick={() => router.push("/admin/tasks/task-history")}
  className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
>
  <History className="h-4 w-4" aria-hidden="true" />

  <span>Task History</span>

  {notificationCount > 0 && (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
      {notificationCount > 99 ? "99+" : notificationCount}
    </span>
  )}
</button>

          {/* Create Task */}
          <button
            type="button"
            onClick={() => router.push("/admin/tasks/create")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create Task</span>
          </button>

        </div>
      </div>
    </section>
  );
}