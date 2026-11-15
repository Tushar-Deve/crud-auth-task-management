import { Redirect } from 'expo-router';

import { DashboardTabs } from '@/components/dashboard-shell';
import { useAuth } from '@/context/auth-context';
import { NotificationPreferencesProvider } from '@/context/notification-preferences-context';

export default function AuthenticatedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin' && user.role !== 'user') {
    return <Redirect href="/login" />;
  }

  return (
    <NotificationPreferencesProvider>
      <DashboardTabs />
    </NotificationPreferencesProvider>
  );
}
