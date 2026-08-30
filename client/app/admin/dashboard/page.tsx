"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Users,
} from "lucide-react";
import { useSelector } from "react-redux";
import DashboardCard from "@/components/dashboard/DashboardCard";
import Navbar from "@/components/dashboard/Navbar";
import RecentTasksTable from "@/components/dashboard/RecentTasksTable";
import RecentUsersTable from "@/components/dashboard/RecentUsersTable";
import Sidebar from "@/components/dashboard/Sidebar";
import { getDashboard } from "@/services/dashboardService";

interface DashboardData {
  stats?: {
    totalUsers?: number;
    totalTasks?: number;
    pendingTasks?: number;
    completedTasks?: number;
  };
  recentTasks?: any[];
  recentUsers?: any[];
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboardData, setDashboardData] =
    useState<DashboardData | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const token = useSelector(
    (state: { auth: { token: string | null } }) => state.auth.token
  );

  useEffect(() => {
    if (!token) {
      ;
      return;
    }
    const fetchDashboard = async () => {
      try {

        const data = await getDashboard();

        setDashboardData(data);
      } catch {
      }
    };

    fetchDashboard();
  }, [token]);
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        role="admin"
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}>
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Statistics cards */}
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

          {/* Tables */}
          <section className="mt-6 space-y-6">
            <RecentTasksTable tasks={dashboardData?.recentTasks || []} />
            <RecentUsersTable users={dashboardData?.recentUsers || []} />
          </section>
        </main>
      </div>
    </div>
  );
}
