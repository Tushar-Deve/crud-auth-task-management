"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getUnreadAssignmentNotifications,
  getUnreadTaskHistoryCount,
  markAssignmentNotificationsAsRead,
} from "@/services/taskService";
import {
  useTaskNotificationPreference,
} from "@/services/taskNotificationPreference";
import { CheckSquare, LayoutDashboard, LogOut, Settings, User, Users, X, } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import axios from "axios";
import { logout } from "@/redux/slices/authSlice";
import { logoutUser } from "@/services/authService";
import { persistor } from "@/redux/store";
import type { RootState } from "@/redux/store";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  role: "admin" | "user";
}

interface NavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
}

const navItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "User Management",
    href: "/admin/users",
    icon: Users,
    active: false,
  },
  {
    label: "Task Management",
    href: "/admin/tasks",
    icon: CheckSquare,
    active: false,
  },
  {
    label: "Profile",
    href: "/admin/profile",
    icon: User,
    active: false,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    active: false,
  },
];

const userNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/user/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Tasks",
    href: "/user/tasks",
    icon: CheckSquare,
  },
  {
    label: "Profile",
    href: "/user/profile",
    icon: User,
  },
  {
    label: "Settings",
    href: "/user/settings",
    icon: Settings,
  },
];

export default function Sidebar({
  isOpen,
  onClose,
  collapsed,
  setCollapsed,
  role,
}: SidebarProps) {

  const dispatch = useDispatch();
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);

  const pathname = usePathname();
  const [newTaskCount, setNewTaskCount] = useState(0);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);
  const notificationsEnabled = useTaskNotificationPreference(role, user?.id);

  useEffect(() => {
    if (role !== "user") return;
    if (!token || !notificationsEnabled) {
      setNewTaskCount(0);
      return;
    }

    const viewingTasks = pathname.startsWith("/user/tasks");
    let active = true;
    let requestInProgress = false;

    const loadTaskNotifications = async () => {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        if (viewingTasks) {
          await markAssignmentNotificationsAsRead();
          if (active) setNewTaskCount(0);
          return;
        }

        const response = await getUnreadAssignmentNotifications();
        if (active) setNewTaskCount(Number(response?.count || 0));
      } catch (error) {
        console.error(
          "Failed to load task notifications:",
          error
        );
      } finally {
        requestInProgress = false;
      }
    };

    void loadTaskNotifications();
    const refreshIfVisible = () => {
      if (!viewingTasks && document.visibilityState === "visible") {
        void loadTaskNotifications();
      }
    };
    const refreshOnNotificationUpdate = () => void loadTaskNotifications();
    const refreshTimer = viewingTasks
      ? undefined
      : window.setInterval(refreshIfVisible, 10000);
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("task-notification-updated", refreshOnNotificationUpdate);

    return () => {
      active = false;
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("task-notification-updated", refreshOnNotificationUpdate);
    };
  }, [role, token, pathname, user?.id, notificationsEnabled]);

 useEffect(() => {
  if (role !== "admin") return;
  if (!token || !notificationsEnabled) {
    setAdminNotificationCount(0);
    return;
  }

  let active = true;
  let requestInProgress = false;

  const loadAdminNotifications = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    try {
      const response = await getUnreadTaskHistoryCount();

      if (active) setAdminNotificationCount(Number(response?.count || 0));
    } catch (error) {
      console.error(
        "Failed to load admin task notifications:",
        error
      );
    } finally {
      requestInProgress = false;
    }
  };

  void loadAdminNotifications();
  const refreshIfVisible = () => {
    if (document.visibilityState === "visible") void loadAdminNotifications();
  };

  window.addEventListener(
    "admin-task-notification-updated",
    loadAdminNotifications
  );
  window.addEventListener("focus", refreshIfVisible);
  const refreshTimer = window.setInterval(refreshIfVisible, 10000);

  return () => {
    active = false;
    window.clearInterval(refreshTimer);
    window.removeEventListener("focus", refreshIfVisible);
    window.removeEventListener(
      "admin-task-notification-updated",
      loadAdminNotifications
    );
  };
}, [role, token, user?.id, notificationsEnabled]);

  const items = role === "admin" ? navItems : userNavigation;

  const handleLogout = async () => {
    if (!token) return;

    try {
      const response = await logoutUser(token);

      dispatch(logout());

      await persistor.purge();

      toast.success(response.message);

      router.replace("/login");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Logout failed"
        );
        return;
      }

      console.error(error);
      toast.error("Unexpected error");
    }
  };
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col
transition-all duration-300
${collapsed ? "w-16" : "w-64"}
border-r border-zinc-200 bg-white
dark:border-zinc-800 dark:bg-zinc-950
lg:translate-x-0
${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div
          className={`flex h-16 border-b border-zinc-200 dark:border-zinc-800
  ${collapsed
              ? "items-center justify-center"
              : "items-center justify-between px-6"
            }`}
        ><button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3"
        >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-700 to-teal-700 shadow-md shadow-teal-600/20">
              <LayoutDashboard className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Task Portal
              </span>
            )}

          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;

            const isMyTasks =
              role === "user" && item.label === "My Tasks";

            const isTaskManagement =
              role === "admin" && item.label === "Task Management";

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${collapsed ? "justify-center" : "gap-3"
                  } ${item.active
                    ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                  }`}
              >
                <div className="relative">
                  <Icon
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />

                  {collapsed &&
                    isMyTasks &&
                    newTaskCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {newTaskCount > 9 ? "9+" : newTaskCount}
                      </span>
                    )}
                  {collapsed &&
                    isTaskManagement &&
                    adminNotificationCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {adminNotificationCount > 9
                          ? "9+"
                          : adminNotificationCount}
                      </span>
                    )}
                </div>

                {!collapsed && (
                  <span className="flex flex-1 items-center justify-between gap-2">
                    <span>{item.label}</span>

                    {isMyTasks && newTaskCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {newTaskCount > 99 ? "99+" : newTaskCount}
                      </span>
                    )}
                    {isTaskManagement && adminNotificationCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {adminNotificationCount > 99
                          ? "99+"
                          : adminNotificationCount}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 ${collapsed ? "justify-center" : "gap-3"
              }`}>
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
