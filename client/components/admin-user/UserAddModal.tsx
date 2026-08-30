"use client";

import { useEffect, useState, type FormEvent } from "react";

export interface UserFormData {
    name: string;
    email: string;
    password: string;
}

export interface UserModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: UserFormData) => void;
    initialData?: Partial<UserFormData>;
    isEditMode?: boolean;
}

const initialFormData: UserFormData = {
    name: "",
    email: "",
    password: "",
};

export default function UserAddModal({
    open,
    onClose,
    onSubmit,
    initialData,
    isEditMode = false,
}: UserModalProps) {
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        setFormData({ ...initialFormData, ...initialData });
    }, [initialData]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    const handleChange = (
    field: keyof UserFormData,
    value: string
): void => {
    setFormData((currentData) => ({
        ...currentData,
        [field]: value,
    }));
};

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        onSubmit(formData);

        setFormData(initialFormData);

        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm sm:p-6"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                aria-labelledby="add-user-title"
                aria-modal="true"
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 sm:p-7"
                role="dialog"
            >
                <div className="mb-6">
                    <h2
                        id="add-user-title"
                        className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                    >
                        {isEditMode ? "Edit User" : "Add New User"}
                    </h2>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {isEditMode
                            ? "Update user details."
                            : "Create a new portal user."}
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label
                            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            htmlFor="user-full-name"
                        >
                            Full Name
                        </label>
                        <input
                            required
                            id="user-full-name"
                            type="text"
                            autoComplete="name"
                            value={formData.name}
                            onChange={(event) => handleChange("name", event.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
                        />
                    </div>

                    <div>
                        <label
                            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            htmlFor="user-email"
                        >
                            Email
                        </label>
                        <input
                            required
                            id="user-email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={(event) => handleChange("email", event.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
                        />
                    </div>

                    <div>
                        <label
                            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            htmlFor="user-password"
                        >
                            Password
                        </label>
                        <input
                            required={!isEditMode}
                            minLength={6}
                            placeholder={
                                isEditMode
                                    ? "Leave blank to keep current password"
                                    : "Enter password"
                            }
                            id="user-password"
                            type="password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={(event) => handleChange("password", event.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setFormData(initialFormData);
                                onClose();
                            }}
                            className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            {isEditMode ? "Update User" : "Create User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
