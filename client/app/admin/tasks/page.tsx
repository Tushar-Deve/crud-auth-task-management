"use client";

import axios from "axios";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Users,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useFilteredData } from "@/hooks/useFilteredData";
import TaskHeader from "@/components/admin-task/TaskHeader";
import DashboardCard from "@/components/dashboard/DashboardCard";
import Navbar from "@/components/dashboard/Navbar";
import RecentTasksTable from "@/components/dashboard/RecentTasksTable";
import Sidebar from "@/components/dashboard/Sidebar";
import { getDashboard } from "@/services/dashboardService";
import { getTasks,getUnreadTaskHistoryCount, } from "@/services/taskService";
import EditTaskModal from "@/components/admin-task/EditTaskModal";
import { deleteTask } from "@/services/taskService";
import Pagination from "@/components/reusable/pagination";

interface Task {
  id: number;
  title: string;
  assigned_to: number;
  assigned_by: number;
  assigned_to_name: string;
  assigned_by_name: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  due_date: string;
}
export default function AdminTasksManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const tasksPerPage = 5;
  const token = useSelector((state: any) => state.auth.token);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");
const [notificationCount, setNotificationCount] = useState(0);

  

  const fetchDashboard = async () => {
    if (!token) {
      return;
    }

    try {
      const data = await getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchTasks = async () => {
      try {
        const response = await getTasks(token);
        setTasks(response?.tasks || []);
      } catch {
        
      }
    };

    fetchTasks();
  }, [token]);

  useEffect(() => {
  if (!token) return;

  const fetchNotificationCount = async () => {
    try {
      const response = await getUnreadTaskHistoryCount();

      setNotificationCount(
        Number(response?.count || 0)
      );
    } catch (error) {
      console.error(
        "Failed to load task history notifications:",
        error
      );
    }
  };

  fetchNotificationCount();
}, [token]);

  const filteredTasks = useFilteredData(tasks, {
    searchValue,
    searchFields: ["title", "assigned_to_name"],
    filterField: "priority",
    filterValue: priorityFilter,
  });

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  const startIndex = (currentPage - 1) * tasksPerPage;

  const paginatedTasks = filteredTasks.slice(
    startIndex,
    startIndex + tasksPerPage
  );

  useEffect(() => {
  setCurrentPage(1);
}, [searchValue, priorityFilter]);

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
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
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
          }`}
      >
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title="Task Management"
          subtitle="Overview of your portal activity"
        />


        <TaskHeader
          searchValue={searchValue}
          priorityValue={priorityFilter}
          onSearchChange={setSearchValue}
          onPriorityChange={setPriorityFilter}
           notificationCount={notificationCount}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              title="Total Users"
              value={dashboardData?.stats?.totalUsers || 0}
              growthText="+12% from last month"
              icon={Users}
              iconClassName="text-indigo-600 dark:text-indigo-400"
              iconWrapperClassName="bg-indigo-50 dark:bg-indigo-950/50"
            />
            <DashboardCard
              title="Total Tasks"
              value={dashboardData?.stats?.totalTasks || 0}
              growthText="+8% from last month"
              icon={ClipboardList}
              iconClassName="text-blue-600 dark:text-blue-400"
              iconWrapperClassName="bg-blue-50 dark:bg-blue-950/50"
            />
            <DashboardCard
              title="Pending Tasks"
              value={dashboardData?.stats?.pendingTasks || 0}
              growthText="-3% from last week"
              icon={Clock}
              iconClassName="text-amber-600 dark:text-amber-400"
              iconWrapperClassName="bg-amber-50 dark:bg-amber-950/50"
            />
            <DashboardCard
              title="Completed Tasks"
              value={dashboardData?.stats?.completedTasks || 0}
              growthText="+15% from last month"
              icon={CheckCircle2}
              iconClassName="text-emerald-600 dark:text-emerald-400"
              iconWrapperClassName="bg-emerald-50 dark:bg-emerald-950/50"
            />
          </section>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <section className="mt-6 space-y-6">
            <RecentTasksTable
              tasks={paginatedTasks}
              showActions
              onEdit={handleEdit}
              onDelete={(task) => {
                setTaskToDelete(task);
                setIsDeleteModalOpen(true);
              }}
            />

          </section>
        </main>
        {isEditModalOpen && selectedTask && (
          <EditTaskModal
            task={selectedTask}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedTask(null);
              fetchDashboard();
            }}
          />
        )}
        {isDeleteModalOpen && taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">

              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Delete Task?
              </h2>

              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                  "{taskToDelete.title}"
                </span>
                ? This action cannot be undone.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>

                <button
                  type="button"

                  onClick={async () => {
                    if (!taskToDelete || !token) {
                      toast.error("Unable to delete task.");
                      return;
                    }

                    try {
                      const response = await deleteTask(
                        String(taskToDelete.id),
                        token
                      );

                      toast.success(
                        response?.message || "Task deleted successfully"
                      );

                      setIsDeleteModalOpen(false);
                      setTaskToDelete(null);

                      // Refresh task table
                      const data = await getDashboard();
                      setDashboardData(data);

                    } catch (error) {
                      if (axios.isAxiosError(error)) {
                        toast.error(
                          error.response?.data?.message ||
                          "Failed to delete task."
                        );
                      } else {
                        toast.error("Failed to delete task.");
                      }
                    }
                  }}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}



