"use client";

import { useEffect, useId } from "react";
import { AlertTriangle } from "lucide-react";

export interface UserDeleteModalProps {
    open: boolean;
    title?: string;
    message?: string;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

export default function UserDeleteModal({
    open,
    title = "Delete User",
    message = "Are you sure you want to delete this user? This action cannot be undone.",
    onClose,
    onConfirm,
    loading = false,
}: UserDeleteModalProps) {
    const titleId = useId();
    const messageId = useId();

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !loading) onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [loading, onClose, open]);

    if (!open) return null;

    const handleClose = () => {
        if (!loading) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm sm:p-6"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) handleClose();
            }}
        >
            <div
                aria-busy={loading}
                aria-describedby={messageId}
                aria-labelledby={titleId}
                aria-modal="true"
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 sm:p-7"
                role="alertdialog"
            >
                <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                        <AlertTriangle aria-hidden="true" className="size-5" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                        <h2
                            id={titleId}
                            className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                        >
                            {title}
                        </h2>
                        <p
                            id={messageId}
                            className="mt-1.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400"
                        >
                            {message}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-7 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (!loading) {
                                onConfirm();
                            }
                        }}
                        disabled={loading}
                        className="rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:from-red-500 hover:via-red-400 hover:to-rose-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
