import { AdminTaskManagement } from '@/components/admin-task-management';
import { UserTaskManagement } from '@/components/user-task-management';
import { useAuth } from '@/context/auth-context';

export default function TasksScreen() {
  const { user } = useAuth();
  return user?.role === 'admin'
    ? <AdminTaskManagement />
    : <UserTaskManagement />;
}
