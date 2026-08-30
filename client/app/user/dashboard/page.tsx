"use client";

import { CheckCircle2, ClipboardList, Clock, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import DashboardCard from "@/components/dashboard/DashboardCard";
import Navbar from "@/components/dashboard/Navbar";
import RecentTasksTable from "@/components/dashboard/RecentTasksTable";
import Sidebar from "@/components/dashboard/Sidebar";
import { getMyTasks } from "@/services/user/userTaskService";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";


export default function UserDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    const token = useSelector(
        (state: RootState) => state.auth.token
    );

    const [tasks, setTasks] = useState<any[]>([]);

    const taskStats = {
        total: tasks.length,
        pending: tasks.filter((task) => task.status === "pending").length,
        inProgress: tasks.filter((task) => task.status === "in-progress").length,
        completed: tasks.filter((task) => task.status === "completed").length,
    };

    useEffect(() => {
        if (!token) {
            return;
        }

       const fetchMyTasks = async () => {
    try {
        const data = await getMyTasks();

        setTasks(data.tasks || []);
    } catch (error: any) {
        if (error?.response?.status === 401) {
            return;
        }

        console.error("Failed to fetch tasks:", error);
    }
};

        fetchMyTasks();
    }, [token]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                role="user"
            />

            <div
                className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
                    }`}
            >
                <Navbar
                    onMenuClick={() => setSidebarOpen(true)}
                    title="My Dashboard"
                    subtitle="Overview of your assigned tasks"
                />

                <main className="px-4 py-6 sm:px-6 lg:px-8">

                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                        <DashboardCard
                            title="My Tasks"
                            value={taskStats.total}
                            growthText="Your assigned tasks"
                            icon={ClipboardList}
                            iconClassName="text-indigo-600 dark:text-indigo-400"
                            iconWrapperClassName="bg-indigo-50 dark:bg-indigo-950/50"
                        />

                        <DashboardCard
                            title="Pending Tasks"
                            value={taskStats.pending}
                            growthText="Awaiting progress"
                            icon={Clock}
                            iconClassName="text-amber-600 dark:text-amber-400"
                            iconWrapperClassName="bg-amber-50 dark:bg-amber-950/50"
                        />

                        <DashboardCard
                            title="In Progress"
                            value={taskStats.inProgress}
                            growthText="Currently being worked on"
                            icon={LoaderCircle}
                            iconClassName="text-blue-600 dark:text-blue-400"
                            iconWrapperClassName="bg-blue-50 dark:bg-blue-950/50"
                        />

                        <DashboardCard
                            title="Completed Tasks"
                            value={taskStats.completed}
                            growthText="Successfully completed"
                            icon={CheckCircle2}
                            iconClassName="text-emerald-600 dark:text-emerald-400"
                            iconWrapperClassName="bg-emerald-50 dark:bg-emerald-950/50"
                        />

                    </section>

                    <section className="mt-6">
                        <RecentTasksTable
                            tasks={tasks}
                            title="Recent Tasks"
                            subtitle="Your latest assigned tasks"
                            showAssignedTo={false}
                            viewAllHref=""
                        />
                    </section>

                </main>
            </div>
        </div>
    );
}
