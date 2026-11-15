import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WebsiteTheme } from '@/constants/theme';
import { AppIcon } from '@/components/app-icon';
import { DashboardWelcome } from '@/components/dashboard-welcome';
import { useThemeStyles } from '@/context/app-theme-context';
import { useAuth } from '@/context/auth-context';
import { getMyTasks, type UserTask } from '@/services/user-task-api';
import { useAppAutoRefresh } from '@/hooks/use-app-auto-refresh';

export function UserDashboardHome() {
  const { user, accessToken } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async (silent = false) => {
    if (!accessToken) {
      setError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const result = await getMyTasks(accessToken);
      setTasks(Array.isArray(result.tasks) ? result.tasks : []);
      setError('');
    } catch (requestError) {
      if (!silent) setError(requestError instanceof Error ? requestError.message : 'Could not load your tasks.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadTasks(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadTasks]);

  const refreshTasks = useCallback(() => loadTasks(true), [loadTasks]);
  useAppAutoRefresh(refreshTasks);

  const counts = {
    total: tasks.length,
    pending: tasks.filter((task) => normalizedStatus(task.status) === 'pending').length,
    active: tasks.filter((task) => normalizedStatus(task.status) === 'in-progress').length,
    completed: tasks.filter((task) => normalizedStatus(task.status) === 'completed').length,
  };
  const recentTasks = [...tasks].slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <DashboardWelcome name={user?.name} subtitle="Overview of your assigned work." />

      <View style={styles.headingGroup}>
        <Text style={styles.heading}>Your tasks</Text>
        <Text style={styles.subtitle}>Your task counts are based on the latest data from your account.</Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}><ActivityIndicator color={WebsiteTheme.primary} /><Text style={styles.stateText}>Loading your tasks…</Text></View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={() => void loadTasks()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : (
        <>
          <View style={styles.stats}>
            <StatCard label="My Tasks" value={counts.total} icon="checklist" tone="teal" />
            <StatCard label="Pending" value={counts.pending} icon="clock" tone="amber" />
            <StatCard label="In Progress" value={counts.active} icon="arrow.triangle.2.circlepath" tone="blue" />
            <StatCard label="Completed" value={counts.completed} icon="checkmark.circle" tone="green" />
          </View>

          <View style={styles.sectionHeadingRow}>
            <View style={styles.headingGroup}>
              <Text style={styles.sectionTitle}>Recent Tasks</Text>
              <Text style={styles.subtitle}>Your latest assigned tasks.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/(authenticated)/tasks')} style={styles.viewAll}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </View>

          {recentTasks.length ? recentTasks.map((task) => (
            <View key={String(task.id)} style={styles.taskCard}>
              <View style={styles.taskTop}>
                <Text style={styles.taskTitle}>{task.title || 'Untitled task'}</Text>
                <StatusBadge status={task.status} />
              </View>
              <Text style={styles.taskMeta}>
                {task.due_date || task.dueDate ? `Due ${formatDate(task.due_date || task.dueDate)}` : 'No due date'}
                {task.priority ? `  ·  ${capitalize(task.priority)} priority` : ''}
              </Text>
            </View>
          )) : (
            <View style={styles.stateCard}><Text style={styles.stateText}>No tasks have been assigned to you yet.</Text></View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: 'teal' | 'amber' | 'blue' | 'green' }) {
  const styles = useThemeStyles(baseStyles);
  const iconColor = tone === 'amber' ? '#d97706' : tone === 'blue' ? '#2563eb' : tone === 'green' ? '#059669' : WebsiteTheme.primary;
  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <Text style={styles.statLabel}>{label}</Text>
        <AppIcon name={{ ios: icon as never, android: icon === 'checklist' ? 'checklist' : 'circle', web: icon === 'checklist' ? 'checklist' : 'circle' }} size={19} tintColor={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const styles = useThemeStyles(baseStyles);
  const normalized = normalizedStatus(status);
  return (
    <View style={[styles.statusBadge, normalized === 'completed' ? styles.statusComplete : normalized === 'in-progress' ? styles.statusActive : styles.statusPending]}>
      <Text style={[styles.statusText, normalized === 'completed' ? styles.statusCompleteText : normalized === 'in-progress' ? styles.statusActiveText : styles.statusPendingText]}>
        {normalized === 'in-progress' ? 'In progress' : capitalize(normalized)}
      </Text>
    </View>
  );
}

function normalizedStatus(status?: string | null) {
  const value = (status || '').toLowerCase().replace(/\s+/g, '-');
  return value === 'completed' ? 'completed' : value === 'in-progress' ? 'in-progress' : 'pending';
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending';
}

const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, gap: 18 },
  headingGroup: { flex: 1, minWidth: 0, gap: 4 },
  heading: { color: '#111827', fontSize: 21, lineHeight: 28, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: 13, lineHeight: 19 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 },
  statCard: { width: '48%', flexBasis: '48%', flexGrow: 0, minWidth: 0, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 15, backgroundColor: '#ffffff' },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  statLabel: { flexShrink: 1, color: '#6b7280', fontSize: 12, fontWeight: '600' },
  statValue: { color: '#111827', fontSize: 25, lineHeight: 31, fontWeight: '800' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 3 },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '700' },
  viewAll: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0fdfa' },
  viewAllText: { color: WebsiteTheme.primary, fontSize: 12, fontWeight: '700' },
  taskCard: { padding: 15, gap: 9, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#ffffff' },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  taskTitle: { flex: 1, minWidth: 0, color: '#111827', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  taskMeta: { color: '#6b7280', fontSize: 12, lineHeight: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  statusPending: { backgroundColor: '#fff7ed' },
  statusActive: { backgroundColor: '#eff6ff' },
  statusComplete: { backgroundColor: '#ecfdf5' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusPendingText: { color: '#c2410c' },
  statusActiveText: { color: '#2563eb' },
  statusCompleteText: { color: '#047857' },
  stateCard: { alignItems: 'center', justifyContent: 'center', padding: 22, gap: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#ffffff' },
  stateText: { color: '#6b7280', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#f0fdfa' },
  retryText: { color: WebsiteTheme.primary, fontSize: 12, fontWeight: '700' },
});
