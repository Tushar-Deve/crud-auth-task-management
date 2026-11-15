import { AdminDashboardHome } from '@/components/admin-dashboard-home';
import { UserDashboardHome } from '@/components/user-dashboard-home';
import { useAuth } from '@/context/auth-context';

export default function DashboardScreen() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboardHome /> : <UserDashboardHome />;
}
