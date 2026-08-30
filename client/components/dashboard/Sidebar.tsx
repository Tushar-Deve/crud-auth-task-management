"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getMyTasks } from "@/services/user/userTaskService";
import { getUnreadTaskHistoryCount } from "@/services/taskService";
import { CheckSquare, LayoutDashboard, LogOut, Settings, User, Users, X, } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import axios from "axios";
import { logout } from "@/redux/slices/authSlice";
import { logoutUser } from "@/services/authService";
import { persistor } from "@/redux/store";

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
  const token = useSelector((state: any) => state.auth.token);

  const pathname = usePathname();
  const [newTaskCount, setNewTaskCount] = useState(0);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);

  useEffect(() => {
    if (role !== "user" || !token) return;

    const loadTaskNotifications = async () => {
      try {
        const response = await getMyTasks();

        const taskData =
          response?.tasks ||
          response?.data ||
          response;

        if (!Array.isArray(taskData)) {
          setNewTaskCount(0);
          return;
        }

        const currentTaskIds = taskData.map(
          (task: any) => String(task.id)
        );

        const storedSeenTasks = JSON.parse(
          localStorage.getItem("seenTaskIds") || "[]"
        ) as string[];

        if (pathname === "/user/tasks") {
          localStorage.setItem(
            "seenTaskIds",
            JSON.stringify(currentTaskIds)
          );

          setNewTaskCount(0);
          return;
        }

        
        const newTasks = currentTaskIds.filter(
          (id) => !storedSeenTasks.includes(id)
        );

        setNewTaskCount(newTasks.length);
      } catch (error) {
        console.error(
          "Failed to load task notifications:",
          error
        );
      }
    };

    loadTaskNotifications();
  }, [role, token, pathname]);

  useEffect(() => {
    if (role !== "user" || !token) return;

    const checkNewTasks = () => {
      const storedCount = Number(
        localStorage.getItem("userTaskNotificationCount") || "0"
      );

      setNewTaskCount(storedCount);
    };

    checkNewTasks();

    window.addEventListener("task-notification-updated", checkNewTasks);

    return () => {
      window.removeEventListener(
        "task-notification-updated",
        checkNewTasks
      );
    };
  }, [role, token]);

 useEffect(() => {
  if (role !== "admin" || !token) return;

  const loadAdminNotifications = async () => {
    try {
      const response = await getUnreadTaskHistoryCount();

      setAdminNotificationCount(
        Number(response?.count || 0)
      );
    } catch (error) {
      console.error(
        "Failed to load admin task notifications:",
        error
      );

      setAdminNotificationCount(0);
    }
  };

  loadAdminNotifications();

  window.addEventListener(
    "admin-task-notification-updated",
    loadAdminNotifications
  );

  return () => {
    window.removeEventListener(
      "admin-task-notification-updated",
      loadAdminNotifications
    );
  };
}, [role, token]);

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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20">
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
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
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
