"use client";

import { useRouter } from "next/navigation";
import { Download, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { getMyTasks, submitTask } from "@/services/user/userTaskService";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import Pagination from "@/components/reusable/pagination";
import ConfirmSubmitModal from "@/components/reusable/confirmSubmitModal";

type TaskStatus = "Pending" | "In Progress" | "completed";
type TaskPriority = "Low" | "Medium" | "High";

interface TaskAttachment {
  id: number;
  fileUrl: string;
}

interface Task {
  id: number;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedBy: string;
  attachments?: TaskAttachment[];
}

const priorityStyles: Record<TaskPriority, string> = {
  Low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  High: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

const statusStyles: Record<TaskStatus, string> = {
  Pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "In Progress":
    "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  completed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
};

export default function MyTasksPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = useSelector((state: any) => state.auth.token);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // -------------------------
  // Fetch Tasks
  // -------------------------

  useEffect(() => {
    const fetchTasks = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getMyTasks();

        const taskData =
          response?.tasks ||
          response?.data ||
          response;

        const formattedTasks = Array.isArray(taskData)
          ? taskData.map((task) => ({
            ...task,

            dueDate:
              task.dueDate ||
              task.due_date,

            assignedBy:
              task.assignedBy ||
              task.assigned_by_name,

            // File attachments
            attachments:
              Array.isArray(task.attachments)
                ? task.attachments
                : [],
          }))
          : [];

        setTasks(formattedTasks);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          return;
        }
        setError("Failed to load tasks.");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [token]);

  // -------------------------
  // Pagination
  // -------------------------

  const tasksPerPage = 5;

  const totalPages = Math.ceil(
    tasks.length / tasksPerPage
  );

  const startIndex =
    (currentPage - 1) * tasksPerPage;

  const visibleTasks = tasks.slice(
    startIndex,
    startIndex + tasksPerPage
  );

  // -------------------------
  // Submit Task
  // -------------------------

  const handleConfirmSubmit = async () => {
    if (!selectedTask) return;

    try {
      setLoading(true);

      const response = await submitTask(
        selectedTask.id
      );

      toast.success(
        response?.message ||
        "Task submitted successfully"
      );

      setShowSubmitModal(false);
      setSelectedTask(null);

      // Refresh tasks
      const updatedResponse =
        await getMyTasks();

      const taskData =
        updatedResponse?.tasks ||
        updatedResponse?.data ||
        updatedResponse;

      const formattedTasks =
        Array.isArray(taskData)
          ? taskData.map((task) => ({
            ...task,

            dueDate:
              task.dueDate ||
              task.due_date,

            assignedBy:
              task.assignedBy ||
              task.assigned_by_name,

            attachments:
              Array.isArray(task.attachments)
                ? task.attachments
                : [],
          }))
          : [];

      setTasks(formattedTasks);
    } catch (error: any) {

      toast.error(
        error?.response?.data?.message ||
        "Failed to submit task"
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Download Attachment
  // -------------------------

  const handleDownload = async (
    fileUrl: string
  ) => {
    try {
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error("File download failed");
      }

      const blob = await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      const fileName =
        fileUrl.split("/").pop() ||
        "attachment";

      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {

      toast.error(
        "Unable to download file."
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role="user"
      />

      <div
        className={`transition-all duration-300 ${sidebarCollapsed
          ? "lg:pl-16"
          : "lg:pl-64"
          }`}
      >

        <Navbar
          onMenuClick={() =>
            setSidebarOpen(true)
          }
          title="My Tasks"
          subtitle="Manage and track your assigned tasks"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">

            <div className="border-b border-zinc-200 px-5 py-4 sm:px-6 dark:border-zinc-800">

              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Assigned Tasks
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Stay on top of your current work and upcoming deadlines.
              </p>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[760px] text-left">

                <thead className="bg-zinc-50 dark:bg-zinc-900/60">

                  <tr className="border-b border-zinc-200 dark:border-zinc-800">

                    {[
                      "Task",
                      "Priority",
                      "Status",
                      "Due Date",
                      "Assigned By",
                      "Action",
                    ].map((heading) => (

                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 sm:px-6"
                      >
                        {heading}
                      </th>

                    ))}

                  </tr>

                </thead>

                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">

                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                      >
                        Loading tasks...
                      </td>
                    </tr>
                  )}

                  {!loading && error && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-red-600 dark:text-red-400"
                      >
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    visibleTasks.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          No tasks assigned to you.
                        </td>
                      </tr>
                    )}

                  {!loading &&
                    !error &&
                    visibleTasks.map((task) => (

                      <tr
                        key={task.id}
                        className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
                      >

                        {/* Task + Attachment */}

                        <td className="px-5 py-4 sm:px-6">

                          <div className="flex flex-col gap-2">

                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {task.title}
                            </span>

                            {/* Attachment */}


                          </div>

                        </td>

                        {/* Priority */}

                        <td className="px-5 py-4 sm:px-6">

                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
                          >
                            {task.priority}
                          </span>

                        </td>

                        {/* Status */}

                        <td className="px-5 py-4 sm:px-6">

                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${statusStyles[task.status]}`}
                          >
                            {task.status}
                          </span>

                        </td>

                        {/* Due Date */}

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-600 sm:px-6 dark:text-zinc-300">
                          {task.dueDate}
                        </td>

                        {/* Assigned By */}

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-zinc-600 sm:px-6 dark:text-zinc-300">
                          {task.assignedBy}
                        </td>

                        {/* Action */}

                        <td className="px-5 py-4 sm:px-6">

                          <div className="flex items-center gap-2">

                            {/* View */}

                            <button
                              type="button"
                              aria-label="View task details"
                              title="View task details"
                              onClick={() =>
                                router.push(
                                  `/user/tasks/${task.id}`
                                )
                              }
                              className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-indigo-400 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300"
                            >

                              <Eye
                                className="h-4 w-4"
                                aria-hidden="true"
                              />

                            </button>

                            {/* Submit */}

                            <button
                              type="button"
                              disabled={
                                task.status ===
                                "completed"
                              }
                              onClick={() => {

                                if (
                                  task.status ===
                                  "completed"
                                ) {
                                  return;
                                }

                                setSelectedTask(
                                  task
                                );

                                setShowSubmitModal(
                                  true
                                );

                              }}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {task.status ===
                                "completed"
                                ? "Submitted"
                                : "Submit"}

                            </button>

                            {/* Query (Used in Future development) */}

                            {/* <button
                              type="button"
                              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                            >
                              Query
                            </button> */}

                            {/* Attachment */}

                            {task.attachments && task.attachments.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                {task.attachments.map((attachment) => {
                                  const fileName =
                                    attachment.fileUrl.split("/").pop() || "Attachment";

                                  return (
                                    <button
                                      key={attachment.id}
                                      type="button"
                                      onClick={() =>
                                        handleDownload(attachment.fileUrl)
                                      }
                                      title={fileName}
                                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    >
                                      <Download
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      />

                                      Download
                                    </button>
                                  );
                                })}
                              </div>
                            )}



                          </div>

                        </td>

                      </tr>

                    ))}

                </tbody>

              </table>

            </div>

            <div className="px-5 py-4 sm:px-6"></div>

          </section>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

        </main>

      </div>

      <ConfirmSubmitModal
        open={showSubmitModal}
        taskTitle={
          selectedTask?.title || ""
        }
        onCancel={() => {
          setShowSubmitModal(false);
          setSelectedTask(null);
        }}
        onConfirm={handleConfirmSubmit}
      />

    </div>
  );
}

