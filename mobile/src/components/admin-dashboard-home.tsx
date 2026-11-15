import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { WebsiteTheme } from '@/constants/theme';
import { AppIcon } from '@/components/app-icon';
import { DashboardWelcome } from '@/components/dashboard-welcome';
import { useThemeStyles } from '@/context/app-theme-context';
import { useAuth } from '@/context/auth-context';
import { getAdminDashboard, type AdminDashboardData, type ManagedTask, type ManagedUser } from '@/services/admin-api';
import { useAppAutoRefresh } from '@/hooks/use-app-auto-refresh';

export function AdminDashboardHome() {
  const { user, accessToken } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (refresh = false, silent = false) => {
    if (!accessToken) {
      setError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      setDashboard(await getAdminDashboard(accessToken));
      setError('');
    } catch (requestError) {
      if (!silent) setError(requestError instanceof Error ? requestError.message : 'Could not load dashboard data.');
    } finally {
      if (!silent) setLoading(false);
      if (refresh) setRefreshing(false);
    }
  }, [accessToken]);

  const refreshDashboard = useCallback(() => loadDashboard(false, true), [loadDashboard]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadDashboard(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadDashboard]);

  useAppAutoRefresh(refreshDashboard);
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard(true)} tintColor={WebsiteTheme.primary} />}>
      <DashboardWelcome name={user?.name} subtitle="Overview of your users and tasks." />

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.sectionSubtitle}>Current activity across your portal.</Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}><ActivityIndicator color={WebsiteTheme.primary} /><Text style={styles.stateText}>Loading dashboard data…</Text></View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={() => void loadDashboard()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : dashboard ? (
        <>
          <View style={styles.stats}>
            <MetricCard label="Total Users" value={dashboard.stats.totalUsers} icon={{ ios: 'person.2.fill', android: 'groups', web: 'groups' }} tone="teal" />
            <MetricCard label="Total Tasks" value={dashboard.stats.totalTasks} icon={{ ios: 'checklist', android: 'checklist', web: 'checklist' }} tone="teal" />
            <MetricCard label="Pending Tasks" value={dashboard.stats.pendingTasks} icon={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }} tone="amber" />
            <MetricCard label="Completed Tasks" value={dashboard.stats.completedTasks} icon={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} tone="green" />
          </View>

          <RecentTasks tasks={dashboard.recentTasks || []} />
          <RecentUsers users={dashboard.recentUsers || []} />
        </>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: { ios: string; android: string; web: string };
  tone: 'teal' | 'blue' | 'amber' | 'green';
}) {
  const styles = useThemeStyles(baseStyles);
  const color = tone === 'amber' ? '#d97706' : tone === 'blue' ? '#2563eb' : tone === 'green' ? '#059669' : WebsiteTheme.primary;
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.metricIcon}><AppIcon name={icon as never} size={20} tintColor={color} /></View>
      </View>
      <Text style={styles.metricValue}>{Number.isFinite(value) ? value : '—'}</Text>
    </View>
  );
}

function RecentTasks({ tasks }: { tasks: ManagedTask[] }) {
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.listCard}>
      <View style={styles.listHeader}>
        <View style={styles.listHeadingText}>
          <Text style={styles.listTitle}>Recent Tasks</Text>
          <Text style={styles.listSubtitle}>Latest task activity across the portal.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(authenticated)/tasks')} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>
      {tasks.length ? tasks.map((task) => (
        <View key={String(task.id)} style={styles.taskRow}>
          <View style={styles.taskMain}>
            <Text numberOfLines={2} style={styles.taskTitle}>{task.title}</Text>
            <Text numberOfLines={1} style={styles.taskMeta}>
              {task.assigned_to_name || 'Unassigned'} · {task.assigned_by_name || 'Unknown assigner'}
            </Text>
            <Text style={styles.taskMeta}>
              {task.due_date ? `Due ${formatDate(task.due_date)} · ` : ''}{capitalize(task.priority)}
            </Text>
          </View>
          <StatusBadge status={task.status} />
        </View>
      )) : <Text style={styles.emptyText}>No tasks to show yet.</Text>}
    </View>
  );
}

function RecentUsers({ users }: { users: ManagedUser[] }) {
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.listCard}>
      <View style={styles.listHeader}>
        <View style={styles.listHeadingText}>
          <Text style={styles.listTitle}>Recent Users</Text>
          <Text style={styles.listSubtitle}>Newly registered portal members.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(authenticated)/users')} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>
      {users.length ? users.map((item) => (
        <View key={String(item.id)} style={styles.userRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.trim()?.charAt(0)?.toUpperCase() || '?'}</Text></View>
          <View style={styles.userDetails}>
            <Text numberOfLines={1} style={styles.userName}>{item.name || 'Name unavailable'}</Text>
            <Text numberOfLines={1} style={styles.userEmail}>{item.email || 'Email unavailable'}</Text>
            <Text style={styles.userDate}>{item.createdAt ? `Joined ${formatDate(item.createdAt)}` : capitalize(item.role)}</Text>
          </View>
          <View style={styles.roleBadge}><Text style={styles.roleText}>{item.role || 'user'}</Text></View>
        </View>
      )) : <Text style={styles.emptyText}>No users to show yet.</Text>}
    </View>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const styles = useThemeStyles(baseStyles);
  const value = (status || 'pending').toLowerCase();
  const isComplete = value === 'completed';
  const isActive = value === 'in-progress';
  return (
    <View style={[styles.statusBadge, isComplete ? styles.statusComplete : isActive ? styles.statusActive : styles.statusPending]}>
      <Text style={[styles.statusText, isComplete ? styles.statusCompleteText : isActive ? styles.statusActiveText : styles.statusPendingText]}>
        {isActive ? 'In progress' : capitalize(value)}
      </Text>
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function capitalize(value?: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not set';
}

const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 1000, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 30, gap: 18 },
  sectionHeading: { gap: 3, marginTop: 2 },
  sectionTitle: { color: '#111827', fontSize: 19, lineHeight: 26, fontWeight: '700' },
  sectionSubtitle: { color: '#6b7280', fontSize: 12, lineHeight: 18 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flexGrow: 1, flexBasis: '47%', maxWidth: '49%', minWidth: 0, minHeight: 116, padding: 16, justifyContent: 'space-between', gap: 13, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#ffffff' },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  metricLabel: { flex: 1, color: '#6b7280', fontSize: 13, fontWeight: '600' },
  metricIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f0fdfa' },
  metricValue: { color: '#111827', fontSize: 27, lineHeight: 33, fontWeight: '800' },
  listCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#ffffff' },
  listHeader: { minHeight: 73, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  listHeadingText: { flex: 1, minWidth: 0, gap: 3 },
  listTitle: { color: '#111827', fontSize: 15, fontWeight: '700' },
  listSubtitle: { color: '#6b7280', fontSize: 11, lineHeight: 16 },
  viewAll: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: '#f0fdfa' },
  viewAllText: { color: WebsiteTheme.primary, fontSize: 11, fontWeight: '700' },
  taskRow: { paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  taskMain: { flex: 1, minWidth: 0, gap: 4 },
  taskTitle: { color: '#111827', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  taskMeta: { color: '#6b7280', fontSize: 11, lineHeight: 16 },
  statusBadge: { flexShrink: 0, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  statusPending: { backgroundColor: '#fff7ed' },
  statusActive: { backgroundColor: '#eff6ff' },
  statusComplete: { backgroundColor: '#ecfdf5' },
  statusText: { fontSize: 9, fontWeight: '700' },
  statusPendingText: { color: '#c2410c' },
  statusActiveText: { color: '#2563eb' },
  statusCompleteText: { color: '#047857' },
  userRow: { minHeight: 70, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: WebsiteTheme.primary },
  avatarText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  userDetails: { flex: 1, minWidth: 0, gap: 2 },
  userName: { color: '#111827', fontSize: 12, fontWeight: '700' },
  userEmail: { color: '#6b7280', fontSize: 11 },
  userDate: { color: '#9ca3af', fontSize: 10 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f0fdfa' },
  roleText: { color: WebsiteTheme.primary, fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  emptyText: { padding: 17, color: '#6b7280', fontSize: 12, textAlign: 'center' },
  stateCard: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 11, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 15, backgroundColor: '#ffffff' },
  stateText: { color: '#6b7280', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f0fdfa' },
  retryText: { color: WebsiteTheme.primary, fontSize: 12, fontWeight: '700' },
});
