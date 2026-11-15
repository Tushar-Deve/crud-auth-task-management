import { AppIcon } from '@/components/app-icon';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WebsiteTheme } from '@/constants/theme';
import { useThemeStyles } from '@/context/app-theme-context';
import { useAuth } from '@/context/auth-context';
import { useAppAutoRefresh } from '@/hooks/use-app-auto-refresh';
import { completeMyTask, downloadTaskAttachment, getMyTasks, UserTaskApiError, type UserTask } from '@/services/user-task-api';

type Filter = 'all' | 'pending' | 'in-progress' | 'completed';
const filters: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
];

export function UserTaskManagement() {
  const { accessToken } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingId, setSavingId] = useState<string | number | null>(null);

  const loadTasks = useCallback(async (showLoader = true, silent = false) => {
    if (!accessToken) {
      setError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }
    if (showLoader) setLoading(true);
    if (!silent) setError('');
    try {
      const result = await getMyTasks(accessToken);
      setTasks(Array.isArray(result.tasks) ? result.tasks : []);
      setError('');
    } catch (requestError) {
      if (requestError instanceof UserTaskApiError && requestError.status === 401) return;
      if (!silent) setError(requestError instanceof Error ? requestError.message : 'Could not load your tasks.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadTasks(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadTasks]);

  const refreshTasks = useCallback(() => loadTasks(false, true), [loadTasks]);
  useAppAutoRefresh(refreshTasks, 10000, savingId === null);

  const visibleTasks = useMemo(
    () => filter === 'all' ? tasks : tasks.filter((task) => normalizeStatus(task.status) === filter),
    [filter, tasks],
  );

  const markComplete = async (task: UserTask) => {
    if (!accessToken) return;
    setSavingId(task.id);
    setActionError('');
    try {
      await completeMyTask(accessToken, task.id);
      setTasks((current) => current.map((item) => String(item.id) === String(task.id) ? { ...item, status: 'completed' } : item));
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Could not update this task.');
    } finally {
      setSavingId(null);
    }
  };

  const openAttachment = async (attachmentId: string | number) => {
    if (!accessToken) {
      setActionError('Your session is unavailable. Please sign in again.');
      return;
    }

    try {
      setActionError('');
      const bytes = await downloadTaskAttachment(accessToken, attachmentId);

      if (Platform.OS === 'web') {
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `task-attachment-${attachmentId}.pdf`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
        return;
      }

      const { File, Paths } = await import('expo-file-system');
      const file = new File(Paths.cache, `task-attachment-${attachmentId}.pdf`);
      await file.write(bytes);
      if (!await File.canPreview(file, { mimeType: 'application/pdf' })) {
        throw new Error('No PDF viewer is available on this device.');
      }
      await File.preview(file, { mimeType: 'application/pdf', title: 'Task attachment' });
    } catch (openError) {
      setActionError(openError instanceof Error ? openError.message : 'Could not open this attachment.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headingGroup}>
        <Text style={styles.title}>My Tasks</Text>
        <Text style={styles.subtitle}>Manage and track your assigned tasks.</Text>
      </View>

      <View style={styles.filterRow}>
        {filters.map((option) => {
          const selected = filter === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(option.value)}
              style={[styles.filterChip, selected && styles.filterChipActive]}>
              <Text style={[styles.filterText, selected && styles.filterTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {actionError ? <View style={styles.errorBox}><Text style={styles.errorText}>{actionError}</Text></View> : null}
      {loading ? (
        <View style={styles.stateCard}><ActivityIndicator color={WebsiteTheme.primary} /><Text style={styles.stateText}>Loading tasks…</Text></View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={() => void loadTasks()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : visibleTasks.length === 0 ? (
        <View style={styles.stateCard}>
          <AppIcon name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }} size={26} tintColor="#94a3b8" />
          <Text style={styles.stateTitle}>{tasks.length ? 'No tasks in this status' : 'No tasks assigned'}</Text>
          <Text style={styles.stateText}>{tasks.length ? 'Choose another filter to see more of your work.' : 'Tasks assigned to you will appear here.'}</Text>
          {tasks.length > 0 ? <Pressable onPress={() => setFilter('all')}><Text style={styles.retryText}>Show all tasks</Text></Pressable> : null}
        </View>
      ) : visibleTasks.map((task) => (
        <View key={String(task.id)} style={styles.taskCard}>
          <View style={styles.taskHeading}>
            <View style={styles.taskHeadingText}>
              <Text style={styles.taskTitle}>{task.title || 'Untitled task'}</Text>
              <Text style={styles.description}>{task.description?.trim() || 'No description provided.'}</Text>
            </View>
            <StatusBadge status={task.status} />
          </View>

          <View style={styles.metadata}>
            <MetaItem label="Priority" value={task.priority ? capitalize(task.priority) : 'Not set'} />
            <MetaItem label="Due date" value={task.due_date || task.dueDate ? formatDate(task.due_date || task.dueDate) : 'Not set'} />
            <MetaItem label="Assigned by" value={task.assigned_by_name || task.assignedBy || 'Not available'} />
          </View>

          {task.attachments?.length ? (
            <View style={styles.attachments}>
              <Text style={styles.attachmentHeading}>Attachments</Text>
              {task.attachments.map((attachment, index) => (
                <Pressable key={String(attachment.id)} accessibilityRole="link" onPress={() => void openAttachment(attachment.id)} style={styles.attachmentLink}>
                  <AppIcon name={{ ios: 'paperclip', android: 'attach_file', web: 'attach_file' }} size={16} tintColor={WebsiteTheme.primary} />
                  <Text numberOfLines={1} style={styles.attachmentText}>{`Attachment ${index + 1}`}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {normalizeStatus(task.status) !== 'completed' ? (
            <Pressable
              accessibilityRole="button"
              disabled={savingId !== null}
              onPress={() => void markComplete(task)}
              style={({ pressed }) => [styles.completeButton, pressed && styles.buttonPressed, savingId !== null && styles.buttonDisabled]}>
              {savingId === task.id ? <ActivityIndicator size="small" color="#ffffff" /> : <AppIcon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={18} tintColor="#ffffff" />}
              <Text style={styles.completeButtonText}>{savingId === task.id ? 'Updating…' : 'Mark completed'}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  const styles = useThemeStyles(baseStyles);
  return <View style={styles.metaItem}><Text style={styles.metaLabel}>{label}</Text><Text style={styles.metaValue}>{value}</Text></View>;
}

function StatusBadge({ status }: { status?: string | null }) {
  const styles = useThemeStyles(baseStyles);
  const value = normalizeStatus(status);
  return (
    <View style={[styles.statusBadge, value === 'completed' ? styles.statusComplete : value === 'in-progress' ? styles.statusActive : styles.statusPending]}>
      <Text style={[styles.statusText, value === 'completed' ? styles.statusCompleteText : value === 'in-progress' ? styles.statusActiveText : styles.statusPendingText]}>
        {value === 'in-progress' ? 'In progress' : capitalize(value)}
      </Text>
    </View>
  );
}

function normalizeStatus(status?: string | null): Filter {
  const value = (status || '').toLowerCase().replace(/\s+/g, '-');
  return value === 'completed' ? 'completed' : value === 'in-progress' ? 'in-progress' : 'pending';
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending';
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const baseStyles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 23, paddingBottom: 28, gap: 15 },
  headingGroup: { gap: 4, marginBottom: 3 },
  title: { color: '#111827', fontSize: 23, lineHeight: 30, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: 14, lineHeight: 20 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, backgroundColor: '#ffffff' },
  filterChipActive: { borderColor: WebsiteTheme.primary, backgroundColor: '#f0fdfa' },
  filterText: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: WebsiteTheme.primary },
  taskCard: { padding: 15, gap: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#ffffff' },
  taskHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskHeadingText: { flex: 1, minWidth: 0, gap: 5 },
  taskTitle: { color: '#111827', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  description: { color: '#6b7280', fontSize: 13, lineHeight: 19 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  statusPending: { backgroundColor: '#fff7ed' },
  statusActive: { backgroundColor: '#eff6ff' },
  statusComplete: { backgroundColor: '#ecfdf5' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusPendingText: { color: '#c2410c' },
  statusActiveText: { color: '#2563eb' },
  statusCompleteText: { color: '#047857' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexGrow: 1, flexBasis: 100, minWidth: 0, padding: 10, gap: 4, borderRadius: 10, backgroundColor: '#f9fafb' },
  metaLabel: { color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { color: '#374151', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  attachments: { gap: 8 },
  attachmentHeading: { color: '#374151', fontSize: 12, fontWeight: '700' },
  attachmentLink: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7 },
  attachmentText: { flex: 1, color: WebsiteTheme.primary, fontSize: 12, fontWeight: '600' },
  completeButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 11, backgroundColor: WebsiteTheme.primary },
  completeButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.6 },
  stateCard: { alignItems: 'center', justifyContent: 'center', padding: 22, gap: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 15, backgroundColor: '#ffffff' },
  stateTitle: { color: '#111827', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  stateText: { color: '#6b7280', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#f0fdfa' },
  retryText: { color: WebsiteTheme.primary, fontSize: 12, fontWeight: '700' },
  errorBox: { padding: 12, borderRadius: 11, backgroundColor: '#fef2f2' },
  errorText: { color: '#b91c1c', fontSize: 12, lineHeight: 17 },
});
