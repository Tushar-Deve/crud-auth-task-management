"use client";

import axios from "axios";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { CalendarDays, FileText, Paperclip, Upload, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import Navbar from "@/components/dashboard/Navbar";
import Sidebar from "@/components/dashboard/Sidebar";
import type { RootState } from "@/redux/store";
import { createTask } from "@/services/taskService";
import { getAllUsers } from "@/services/userService";

type User = {
  id: string | number;
  name: string;
};

type FormErrors = {
  title?: string;
  assignee?: string;
};

export default function CreateTaskPage() {
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const goToTaskManagement = () => router.push("/admin/tasks");

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAttachment(file);
    setAttachmentName(file?.name ?? "");
  };

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;

      try {
        const response = await getAllUsers(token);
        const currentUserId = String(currentUser?.id ?? "");

        setUsers(
          (response.users ?? []).filter(
            (user: User) => String(user.id) !== currentUserId
          )
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Failed to load users.");
          return;
        }

        toast.error("Failed to load users.");
      }
    };

    fetchUsers();
  }, [currentUser?.id, token]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    const nextErrors: FormErrors = {};

    if (!title.trim()) nextErrors.title = "Task title is required.";
    if (!assignee) nextErrors.assignee = "Please select a user.";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please complete the required fields.");
      return;
    }

    if (!token) {
      toast.error("You must be logged in to create a task.");
      return;
    }

    const submitTask = async () => {
      setIsSubmitting(true);

      try {
        const response = await createTask(
          {
            title: title.trim(),
            description,
            priority,
            due_date: dueDate,
            assignedTo: assignee,
            file: attachment,
          },
          token
        );

        toast.success(response?.message || "Task created successfully");
        router.push("/admin/tasks");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Failed to create task.");
          return;
        }

        
        toast.error("Failed to create task.");
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitTask();
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
          title="Create Task"
          subtitle="Create and assign a new task"
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-5 sm:px-6 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                  Create New Task
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Fill in the details below to create and assign a task.
                </p>
              </div>

              <button
                type="button"
                onClick={goToTaskManagement}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                aria-label="Close create task"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label htmlFor="task-title" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="task-title"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
                    }}
                    placeholder="Enter task title..."
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? "task-title-error" : undefined}
                    className={`mt-2 w-full rounded-xl border bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:bg-white focus:ring-2 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950 ${
                      errors.title
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700"
                        : "border-zinc-200 focus:border-indigo-300 focus:ring-indigo-500/20 dark:border-zinc-700 dark:focus:border-indigo-600"
                    }`}
                  />
                  {errors.title && <p id="task-title-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.title}</p>}
                </div>

                <div>
                  <label htmlFor="task-description" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    Description
                  </label>
                  <textarea
                    id="task-description"
                    rows={5}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the task..."
                    className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label htmlFor="assign-to" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      Assign To <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-2">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                      <select
                        id="assign-to"
                        value={assignee}
                        onChange={(event) => {
                          setAssignee(event.target.value);
                          if (errors.assignee) setErrors((current) => ({ ...current, assignee: undefined }));
                        }}
                        aria-invalid={Boolean(errors.assignee)}
                        aria-describedby={errors.assignee ? "assign-to-error" : undefined}
                        className={`w-full appearance-none rounded-xl border bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition-all focus:bg-white focus:ring-2 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:bg-zinc-950 ${
                          errors.assignee
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700"
                            : "border-zinc-200 focus:border-indigo-300 focus:ring-indigo-500/20 dark:border-zinc-700 dark:focus:border-indigo-600"
                        }`}
                      >
                        <option value="" disabled>Select user</option>
                        {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                      </select>
                    </div>
                    {errors.assignee && <p id="assign-to-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.assignee}</p>}
                  </div>

                  <div>
                    <label htmlFor="priority" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Priority</label>
                    <select id="priority" value={priority} onChange={(event) => setPriority(event.target.value as "low" | "medium" | "high")} className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="due-date" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Due Date</label>
                    <div className="relative mt-2">
                      <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                      <input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950" />
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Attachment <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span></span>
                    <label htmlFor="attachment" className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30">
                      <Upload className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
                      <span className="min-w-0 truncate">{attachmentName || "Choose a file"}</span>
                      <input id="attachment" type="file" onChange={handleAttachmentChange} className="sr-only" />
                    </label>
                    {attachmentName && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"><Paperclip className="h-3.5 w-3.5" aria-hidden="true" />{attachmentName}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/30">
                <button type="button" onClick={goToTaskManagement} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-70"><FileText className="h-4 w-4" aria-hidden="true" />{isSubmitting ? "Creating Task..." : "Create Task"}</button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
