"use client";

interface ConfirmSubmitModalProps {
  open: boolean;
  taskTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmSubmitModal({
  open,
  taskTitle,
  onCancel,
  onConfirm,
}: ConfirmSubmitModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">

        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Submit Task?
        </h2>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Are you sure you want to submit{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">
            "{taskTitle}"
          </span>
          ?
        </p>

        <div className="mt-6 flex justify-end gap-3">

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            Confirm
          </button>

        </div>
      </div>
    </div>
  );
}