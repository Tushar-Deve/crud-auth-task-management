"use client";

import { Pencil, Trash2 } from "lucide-react";

export interface UserTableRow {
  id: number | string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

export interface UserTableProps {
  users: UserTableRow[];
  onEdit?: (user: UserTableRow) => void;
  onDelete?: (user: UserTableRow) => void;
}

const roleStyles = {
  admin:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-500/30",
  user:
    "bg-zinc-100 text-zinc-700 ring-zinc-600/10 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-500/20",
};

export default function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950/70 dark:shadow-none">
      <div className="overflow-x-auto">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="7" r="4" />
                <path d="M20 8v6" strokeLinecap="round" />
                <path d="M23 11h-6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                No users found
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                There are no users to display yet.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50">
                <th className="px-5 py-3 font-medium text-zinc-600 dark:text-zinc-300">
                  Avatar
                </th>
                <th className="px-5 py-3 font-medium text-zinc-600 dark:text-zinc-300">
                  Name
                </th>
                <th className="px-5 py-3 font-medium text-zinc-600 dark:text-zinc-300">
                  Email
                </th>
                <th className="px-5 py-3 font-medium text-zinc-600 dark:text-zinc-300">
                  Role
                </th>
                <th className="px-5 py-3 font-medium text-zinc-600 dark:text-zinc-300">
                  Joined Date
                </th>
                <th className="px-5 py-3 font-medium text-zinc-600 dark:text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-5 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {user.name}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                    {user.email}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roleStyles[user.role]}`}
                    >
                      {user.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-zinc-600 dark:text-zinc-300">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(user)}
                        className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-600/40 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                        aria-label={`Edit ${user.name}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete?.(user)}
                        className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-rose-600/40 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                        aria-label={`Delete ${user.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
