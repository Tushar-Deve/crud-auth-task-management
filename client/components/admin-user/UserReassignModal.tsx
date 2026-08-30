"use client";

import { useEffect, useId, useState } from "react";
import { Users } from "lucide-react";
import api from "@/services/axios";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { transferAndDeleteUser } from "@/services/userService";
import { toast } from "sonner";
import axios from "axios";

export interface UserReassignModalProps {
    open: boolean;
    onClose: () => void;
    userId: number | null;
    onSuccess: () => void;
}

interface User {
    id: number;
    name: string;
}



export default function UserReassignModal({ open, onClose, userId, onSuccess}: UserReassignModalProps) {

    const [users, setUsers] = useState<User[]>([]);
    const token = useSelector((state: RootState) => state.auth.token);
    const [selectedUser, setSelectedUser] = useState<number | "">("");
    const [loading, setLoading] = useState(false);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        if (!open || !token || !userId) return;

        const fetchUsers = async () => {
            try {
                setLoading(true);

                const response = await api.get(
                    `/adminRoutes/reassignUsers/${userId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setUsers(response.data.users);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();

    }, [open, token, userId]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !loading) {
                handleClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, loading]);

    const handleClose = () => {
        if (loading) return;

        setSelectedUser("");
        setUsers([]);
        onClose();
    };

    if (!open) return null;

   const handleTransferAndDelete = async () => {
    if (!selectedUser || !userId || !token) return;

    try {
        setLoading(true);

        const response = await transferAndDeleteUser(
            String(userId),
            String(selectedUser),
            token
        );

        toast.success(response.message);

        handleClose();
        onSuccess();

    } catch (error) {
        if (axios.isAxiosError(error)) {
            toast.error(
                error.response?.data?.message || "Something went wrong"
            );
            return;
        }

        console.error(error);
        toast.error("Unexpected error");

    } finally {
        setLoading(false);
    }
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
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                aria-modal="true"
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 sm:p-7"
                role="dialog"
            >
                <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <Users aria-hidden="true" className="size-5" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                        <h2
                            id={titleId}
                            className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                        >
                            Reassign Tasks
                        </h2>
                        <p
                            id={descriptionId}
                            className="mt-1.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400"
                        >
                            This user has assigned tasks. Please select another user before deleting this account.
                        </p>
                    </div>
                </div>

                <div className="mt-6">
                    <label
                        className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        htmlFor="reassign-user-select"
                    >
                        Assign To
                    </label>
                    <select
                        id="reassign-user-select"
                        value={selectedUser}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSelectedUser(value ? Number(value) : "");
                        }}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
                    >
                        <option value="">Select User</option>

                        {users.map((user) => (
                            <option
                                key={user.id}
                                value={user.id}
                            >
                                {user.name}
                            </option>
                        ))}
                    </select>
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
                        onClick={handleTransferAndDelete}
                        disabled={loading || !selectedUser}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Transfer & Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
