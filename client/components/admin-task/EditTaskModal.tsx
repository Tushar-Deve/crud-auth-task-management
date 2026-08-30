"use client";

import axios from "axios";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { CalendarDays, FileText, Paperclip, Upload, UserRound, X } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { updateTask } from "@/services/taskService";
import type { RootState } from "@/redux/store";

export type Task = {
  id: number;
  title: string;
  description?: string;
  assigned_to: number;
  assigned_to_name: string;
  assigned_by: number;
  assigned_by_name: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  due_date: string;
};

type EditTaskModalProps = {
  task: Task;
  onClose: () => void;
};

const toDateInputValue = (value: string) => value ? value.slice(0, 10) : "";

export default function EditTaskModal({ task, onClose }: EditTaskModalProps) {
  const token = useSelector((state: RootState) => state.auth.token);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assignee, setAssignee] = useState(String(task.assigned_to));
  const [priority, setPriority] = useState<Task["priority"]>(task.priority);
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [dueDate, setDueDate] = useState(toDateInputValue(task.due_date));
  const [attachmentName, setAttachmentName] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setAssignee(String(task.assigned_to));
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(toDateInputValue(task.due_date));
    setAttachmentName("");
  }, [task]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachmentName(event.target.files?.[0]?.name ?? "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    if (!token) {
      toast.error("You must be logged in to update a task.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await updateTask(
        String(task.id),
        {
          title: title.trim(),
          description,
          status,
          file: null,
        },
        token
      );

      toast.success(response?.message || "Task updated successfully");

      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to update task."
        );
      } else {
        console.error(error);
        toast.error("Failed to update task.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-zinc-950/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 sm:max-h-[calc(100vh-3rem)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-5 sm:px-6 dark:border-zinc-800">
          <div>
            <h2 id="edit-task-title" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">Edit Task</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Update the task details below.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50" aria-label="Close edit task">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="edit-task-title-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Task Title <span className="text-red-500">*</span></label>
              <input id="edit-task-title-input" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter task title..." className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-600 dark:focus:bg-zinc-950" />
            </div>

            <div>
              <label htmlFor="edit-task-description" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Description</label>
              <textarea id="edit-task-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the task..." className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-600 dark:focus:bg-zinc-950" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="edit-assign-to" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Assign To <span className="text-red-500">*</span></label>
                <div className="relative mt-2">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                  <select id="edit-assign-to" required value={assignee} onChange={(event) => setAssignee(event.target.value)} className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950">
                    <option value={String(task.assigned_to)}>{task.assigned_to_name}</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-priority" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Priority</label>
                <select id="edit-priority" value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])} className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-status" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Status</label>
                <select id="edit-status" value={status} onChange={(event) => setStatus(event.target.value as Task["status"])} className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950">
                  <option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-due-date" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Due Date</label>
                <div className="relative mt-2">
                  <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                  <input id="edit-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950" />
                </div>
              </div>

              <div className="md:col-span-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Attachment <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span></span>
                <label htmlFor="edit-attachment" className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30">
                  <Upload className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" /><span className="min-w-0 truncate">{attachmentName || "Choose a file"}</span>
                  <input id="edit-attachment" type="file" onChange={handleAttachmentChange} className="sr-only" />
                </label>
                {attachmentName && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"><Paperclip className="h-3.5 w-3.5" aria-hidden="true" />{attachmentName}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/30">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? "Updating Task..." : "Update Task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
