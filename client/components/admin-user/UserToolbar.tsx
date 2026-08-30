"use client";

import { Plus, Search } from "lucide-react";

export interface UserToolbarProps {
  searchValue?: string;
  roleValue?: string;
  onSearchChange?: (value: string) => void;
  onRoleChange?: (value: string) => void;
  onAddUser?: () => void;
}

export default function UserToolbar({
  searchValue = "",
  roleValue = "all",
  onSearchChange,
  onRoleChange,
  onAddUser,
}: UserToolbarProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm shadow-zinc-200/60 backdrop-blur-md sm:p-5 dark:border-zinc-800 dark:bg-zinc-950/70 dark:shadow-none">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search users</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search users by name or email..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
            />
          </label>

          <div className="w-full sm:w-44">
            <label className="sr-only" htmlFor="role-filter">
              Filter by role
            </label>
            <select
              id="role-filter"
              value={roleValue}
              onChange={(event) => onRoleChange?.(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-indigo-600 dark:focus:bg-zinc-950"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddUser}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:from-indigo-500 hover:via-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add User</span>
        </button>
      </div>
    </section>
  );
}
