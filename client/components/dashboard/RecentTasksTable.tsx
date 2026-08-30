import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface Task {
  id: number;
  title: string;
  assigned_to: number;
  assigned_by: number;
  assigned_to_name: string;
  assigned_by_name: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  due_date: string;
}

interface RecentTasksTableProps {
  tasks: Task[];
  showActions?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  title?: string;
  subtitle?: string;
  showAssignedTo?: boolean;
  viewAllHref?: string;
}

const statusStyles = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30",
    "in-progress":
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-500/30",
    completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30",
};

const priorityStyles = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-zinc-500 dark:text-zinc-400",
};

export default function RecentTasksTable({
  tasks,
  showActions = false,
  onEdit,
  onDelete,
  title = "Recent Tasks",
  subtitle = "Latest task activity across the portal",
  showAssignedTo = true,
  viewAllHref = "/admin/tasks",
}: RecentTasksTableProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            View all
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50">
              <th className="px-6 py-3">Task Name</th>
              {showAssignedTo && <th className="px-6 py-3">Assigned To</th>}
              <th className="px-6 py-3">Assigned By</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Due Date</th>
              {showActions && (
                <th className="px-6 py-3 text-right">Actions</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                  {task.title}
                </td>

                {showAssignedTo && (
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                    {task.assigned_to_name}
                  </td>
                )}

                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                  {task.assigned_by_name}
                </td>

                <td
                  className={`px-6 py-4 font-medium ${priorityStyles[task.priority]
                    }`}
                >
                  {task.priority}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[task.status]
                      }`}
                  >
                    {task.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                  {task.due_date}
                </td>
                {showActions && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(task)}
                        className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                        aria-label={`Edit ${task.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete?.(task)}
                        className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        aria-label={`Delete ${task.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan={4 + Number(showAssignedTo) + Number(showActions)}
                  className="px-6 py-12 text-center"
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    No tasks assigned yet
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Tasks assigned to you will appear here.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
