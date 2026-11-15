import { AdminUserManagement } from '@/components/admin-user-management';
import { DashboardMessage } from '@/components/dashboard-shell';
import { useAuth } from '@/context/auth-context';

export default function UsersScreen() {
  const { user } = useAuth();
  return user?.role === 'admin'
    ? <AdminUserManagement />
    : <DashboardMessage title="User Management" message="User management is only available to admins." />;
}
