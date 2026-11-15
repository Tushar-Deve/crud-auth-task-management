import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { WebsiteTheme } from '@/constants/theme';
import { useThemeStyles } from '@/context/app-theme-context';
import { useAuth } from '@/context/auth-context';
import { useAppAutoRefresh } from '@/hooks/use-app-auto-refresh';
import {
  createAdminTask,
  deleteAdminTask,
  getAdminTaskHistory,
  getAdminTasks,
  getAdminUsers,
  ApiRequestError,
  updateAdminTask,
  type ManagedTask,
  type ManagedUser,
} from '@/services/admin-api';

type Priority = 'all' | ManagedTask['priority'];
type TaskStatus = ManagedTask['status'];

const priorities: ManagedTask['priority'][] = ['low', 'medium', 'high'];
const statuses: TaskStatus[] = ['pending', 'in-progress', 'completed'];

export function AdminTaskManagement() {
  const { accessToken, user } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const [tasks, setTasks] = useState<ManagedTask[]>([]);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [assignableUsers, setAssignableUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ManagedTask | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ManagedTask['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [assignee, setAssignee] = useState<ManagedUser | null>(null);
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdTaskNotice, setCreatedTaskNotice] = useState<{ title: string; assignee: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManagedTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (isRefresh = false, silent = false) => {
    if (!accessToken) {
      setError('Your session is unavailable. Please sign in again.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const [taskResponse, userResponse, historyResponse] = await Promise.all([
        getAdminTasks(accessToken),
        getAdminUsers(accessToken),
        getAdminTaskHistory(accessToken).catch(() => null),
      ]);
      setTasks(taskResponse.tasks ?? []);
      setAssignableUsers((userResponse.users ?? []).filter((candidate) => String(candidate.id) !== String(user?.id ?? '')));
      setCompletedTodayCount(countCompletedToday(historyResponse?.history ?? []));
      setError('');
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 401) return;
      if (!silent) setError(loadError instanceof Error ? loadError.message : 'Could not load task data.');
    } finally {
      if (!silent) setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [accessToken, user?.id]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadData(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [accessToken, loadData]);

  const refreshData = useCallback(() => loadData(false, true), [loadData]);
  useAppAutoRefresh(refreshData, 10000, !formOpen && !pendingDelete && !assigneePickerOpen && !datePickerOpen);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesQuery = !query || task.title.toLowerCase().includes(query) || (task.assigned_to_name ?? '').toLowerCase().includes(query);
      return matchesQuery && (priorityFilter === 'all' || task.priority === priorityFilter);
    });
  }, [priorityFilter, search, tasks]);

  const openCreateForm = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setDatePickerOpen(false);
    setAssignee(null);
    setStatus('pending');
    setFormOpen(true);
  };

  const openEditForm = (task: ManagedTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    setDatePickerOpen(false);
    setStatus(task.status);
    setAssignee(null);
    setFormOpen(true);
  };

  const saveTask = async () => {
    if (!accessToken) return;
    if (!title.trim()) {
      Alert.alert('Task title required', 'Enter a title before saving.');
      return;
    }
    if (!editingTask && !assignee) {
      Alert.alert('Assignee required', 'Choose a user to assign this task to.');
      return;
    }
    setSaving(true);
    const createdTaskTitle = title.trim();
    const createdAssigneeName = assignee?.name;
    try {
      if (editingTask) {
        await updateAdminTask(accessToken, editingTask.id, {
          title: title.trim(),
          description,
          status,
        });
      } else {
        await createAdminTask(accessToken, {
          title: title.trim(),
          description: description.trim(),
          priority,
          due_date: dueDate ? normalizeDateInput(dueDate) : null,
          assignedTo: String(assignee!.id).trim(),
        });
      }
      setFormOpen(false);
      setDatePickerOpen(false);
      if (!editingTask) setCreatedTaskNotice({ title: createdTaskTitle, assignee: createdAssigneeName ?? 'the selected user' });
      await loadData(true);
    } catch (saveError) {
      Alert.alert(editingTask ? 'Could not update task' : 'Could not create task', saveError instanceof Error ? saveError.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (task: ManagedTask) => {
    setPendingDelete(task);
  };

  const deleteTask = async (task: ManagedTask) => {
    if (!accessToken) return;
    setDeleting(true);
    try {
      await deleteAdminTask(accessToken, task.id);
      setTasks((current) => current.filter((item) => String(item.id) !== String(task.id)));
      setPendingDelete(null);
      await loadData(true);
    } catch (deleteError) {
      Alert.alert('Could not delete task', deleteError instanceof Error ? deleteError.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} tintColor={WebsiteTheme.primary} />}>
        <View style={styles.pageHeading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Task Management</Text>
            <Text style={styles.subtitle}>Create, assign, and track team tasks.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={openCreateForm} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>+ Create</Text>
          </Pressable>
        </View>

        <View style={styles.countCard}>
          <View style={styles.countMetric}>
            <Text style={styles.count}>{tasks.length}</Text>
            <Text style={styles.countLabel}>Total tasks</Text>
          </View>
          <View style={styles.countDivider} />
          <View style={styles.countMetric}>
            <Text style={styles.pendingCount}>{tasks.filter((task) => task.status !== 'completed').length}</Text>
            <Text style={styles.countLabel}>Open</Text>
          </View>
          <View style={styles.countDivider} />
          <View style={styles.countMetric}>
            <Text style={styles.completedCount}>{completedTodayCount}</Text>
            <Text style={styles.countLabel}>Done today</Text>
          </View>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks or assignees"
          placeholderTextColor="#9ca3af"
          accessibilityLabel="Search tasks or assignees"
          style={styles.searchInput}
          autoCapitalize="none"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', ...priorities] as const).map((filter) => (
            <Pressable key={filter} onPress={() => setPriorityFilter(filter)} style={[styles.filterChip, priorityFilter === filter && styles.filterChipActive]}>
              <Text style={[styles.filterText, priorityFilter === filter && styles.filterTextActive]}>{filter === 'all' ? 'All priorities' : `${filter[0].toUpperCase()}${filter.slice(1)}`}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator style={styles.centerState} color={WebsiteTheme.primary} /> : null}
        {!loading && error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load tasks</Text>
            <Text style={styles.stateMessage}>{error}</Text>
            <Pressable onPress={() => void loadData()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : null}
        {!loading && !error && filteredTasks.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>{tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}</Text>
            <Text style={styles.stateMessage}>{tasks.length === 0 ? 'Create a task and assign it to a team member.' : 'Try another search or priority filter.'}</Text>
          </View>
        ) : null}

        {!loading && !error ? filteredTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskTitleRow}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={[styles.priorityBadge, task.priority === 'high' && styles.highPriority, task.priority === 'low' && styles.lowPriority]}>
                <Text style={[styles.priorityText, task.priority === 'high' && styles.highPriorityText, task.priority === 'low' && styles.lowPriorityText]}>{task.priority}</Text>
              </View>
            </View>
            {task.description ? <Text style={styles.description} numberOfLines={3}>{task.description}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assigned to</Text>
              <Text style={styles.metaValue}>{task.assigned_to_name || 'Unassigned'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due date</Text>
              <Text style={styles.metaValue}>{formatDueDate(task.due_date)}</Text>
            </View>
            <View style={styles.taskFooter}>
              <View style={[styles.statusBadge, task.status === 'completed' && styles.completeStatus, task.status === 'in-progress' && styles.progressStatus]}>
                <Text style={[styles.statusText, task.status === 'completed' && styles.completeStatusText, task.status === 'in-progress' && styles.progressStatusText]}>{formatStatus(task.status)}</Text>
              </View>
              <View style={styles.taskActions}>
                <Pressable accessibilityRole="button" onPress={() => openEditForm(task)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Edit</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => confirmDelete(task)} style={styles.deleteButton}><Text style={styles.deleteButtonText}>Delete</Text></Pressable>
              </View>
            </View>
          </View>
        )) : null}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={[styles.modalBackdrop, styles.clearModalBackdrop]}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editingTask ? 'Edit task' : 'Create task'}</Text>
              <Text style={styles.modalSubtitle}>{editingTask ? 'Update task details and status.' : 'Add details and assign the task to a user.'}</Text>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Task title" placeholderTextColor="#6b7280" style={styles.fieldInput} returnKeyType="next" />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Describe the task" placeholderTextColor="#6b7280" style={[styles.fieldInput, styles.descriptionInput]} multiline textAlignVertical="top" />
              {!editingTask ? <>
                <Text style={styles.fieldLabel}>Assignee *</Text>
                <Pressable onPress={() => setAssigneePickerOpen(true)} style={styles.selectButton}>
                  <Text style={[styles.selectText, !assignee && styles.selectPlaceholder]}>{assignee?.name ?? 'Select a user'}</Text>
                  <Text style={styles.selectChevron}>⌄</Text>
                </Pressable>
                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.optionRow}>
                  {priorities.map((option) => (
                    <Pressable key={option} onPress={() => setPriority(option)} style={[styles.optionChip, priority === option && styles.optionChipActive]}>
                      <Text style={[styles.optionText, priority === option && styles.optionTextActive]}>{option[0].toUpperCase() + option.slice(1)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Due date (optional)</Text>
                <View style={styles.dateButtonRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={dueDate ? `Due date ${formatDateInput(dueDate)}` : 'Choose a due date'}
                    onPress={() => setDatePickerOpen(true)}
                    style={styles.dateButton}>
                    <Text style={[styles.dateButtonText, !dueDate && styles.selectPlaceholder]}>
                      {dueDate ? formatDateInput(dueDate) : 'Select a due date'}
                    </Text>
                    <Text style={styles.dateButtonIcon}>▦</Text>
                  </Pressable>
                  {dueDate ? (
                    <Pressable accessibilityRole="button" onPress={() => setDueDate('')} style={styles.dateClearButton}>
                      <Text style={styles.dateClearText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
                {datePickerOpen ? (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={parseDateInput(dueDate)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      presentation={Platform.OS === 'android' ? 'dialog' : 'inline'}
                      accentColor={WebsiteTheme.primary}
                      onValueChange={(_event, selectedDate) => {
                        setDueDate(toDateInputValue(selectedDate));
                        if (Platform.OS === 'android') setDatePickerOpen(false);
                      }}
                      onDismiss={() => setDatePickerOpen(false)}
                      style={styles.datePicker}
                    />
                    {Platform.OS === 'ios' ? (
                      <Pressable onPress={() => setDatePickerOpen(false)} style={styles.dateDoneButton}>
                        <Text style={styles.dateDoneText}>Done</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </> : <>
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.optionRow}>
                  {statuses.map((option) => (
                    <Pressable key={option} onPress={() => setStatus(option)} style={[styles.optionChip, status === option && styles.optionChipActive]}>
                      <Text style={[styles.optionText, status === option && styles.optionTextActive]}>{formatStatus(option)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.editHint}>Assignee and priority are fixed after creation in the existing API.</Text>
              </>}
              <View style={styles.modalActions}>
                <Pressable onPress={() => { setFormOpen(false); setDatePickerOpen(false); }} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
                <Pressable disabled={saving} onPress={() => void saveTask()} style={[styles.primaryButton, saving && styles.disabledButton]}>
                  <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : editingTask ? 'Save changes' : 'Create task'}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={assigneePickerOpen} transparent animationType="fade" onRequestClose={() => setAssigneePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign to</Text>
            <ScrollView style={styles.assigneeList}>
              {assignableUsers.map((candidate) => (
                <Pressable key={candidate.id} onPress={() => { setAssignee(candidate); setAssigneePickerOpen(false); }} style={styles.assigneeRow}>
                  <View style={styles.assigneeAvatar}><Text style={styles.assigneeInitial}>{candidate.name.charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.assigneeCopy}>
                    <Text style={styles.assigneeName}>{candidate.name}</Text>
                    <Text style={styles.assigneeEmail}>{candidate.email}</Text>
                  </View>
                </Pressable>
              ))}
              {assignableUsers.length === 0 ? <Text style={styles.stateMessage}>No other user accounts are available.</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setAssigneePickerOpen(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(createdTaskNotice)} transparent animationType="fade" onRequestClose={() => setCreatedTaskNotice(null)}>
        <View style={styles.clearFeedbackBackdrop}>
          <ScrollView style={styles.feedbackScroll} contentContainerStyle={styles.feedbackScrollContent}>
          <View style={[styles.feedbackCard, styles.successFeedbackCard]}>
            <View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View>
            <Text style={styles.feedbackEyebrow}>TASK CREATED</Text>
            <Text style={styles.feedbackTitle}>You’re all set</Text>
            <Text style={styles.feedbackSubtitle}>Your task is ready and assigned to the right person.</Text>
            <View style={styles.feedbackDetails}>
              <Text style={styles.feedbackLabel}>TASK</Text>
              <Text style={styles.feedbackValue}>{createdTaskNotice?.title}</Text>
              <View style={styles.feedbackDivider} />
              <Text style={styles.feedbackLabel}>ASSIGNED TO</Text>
              <Text style={styles.feedbackValue}>{createdTaskNotice?.assignee}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setCreatedTaskNotice(null)} style={styles.feedbackPrimaryButton}>
              <Text style={styles.feedbackPrimaryText}>Done</Text>
            </Pressable>
          </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={Boolean(pendingDelete)} transparent animationType="fade" onRequestClose={() => { if (!deleting) setPendingDelete(null); }}>
        <View style={styles.clearFeedbackBackdrop}>
          <ScrollView style={styles.feedbackScroll} contentContainerStyle={styles.feedbackScrollContent}>
          <View style={styles.feedbackCard}>
            <View style={styles.deleteIcon}><Text style={styles.deleteIconText}>!</Text></View>
            <Text style={styles.feedbackTitle}>Delete this task?</Text>
            <Text style={styles.feedbackSubtitle}>This action can’t be undone. The task will be permanently removed.</Text>
            <View style={styles.deleteTaskPreview}>
              <Text style={styles.feedbackLabel}>TASK TO DELETE</Text>
              <Text style={styles.feedbackValue}>{pendingDelete?.title}</Text>
            </View>
            <View style={styles.feedbackActions}>
              <Pressable disabled={deleting} accessibilityRole="button" onPress={() => setPendingDelete(null)} style={styles.feedbackCancelButton}>
                <Text style={styles.feedbackCancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={deleting} accessibilityRole="button" onPress={() => { if (pendingDelete) void deleteTask(pendingDelete); }} style={[styles.feedbackDeleteButton, deleting && styles.disabledButton]}>
                {deleting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.feedbackDeleteText}>Delete task</Text>}
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function formatStatus(value: TaskStatus) {
  return value === 'in-progress' ? 'In progress' : value[0].toUpperCase() + value.slice(1);
}

function formatDueDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function localDateKey(value: Date) {
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function countCompletedToday(history: { taskId: string | number; updatedAt: string; status: string }[]) {
  const todayKey = localDateKey(new Date());
  return new Set(history
    .filter((item) => item.status === 'completed' && localDateKey(new Date(item.updatedAt)) === todayKey)
    .map((item) => String(item.taskId))).size;
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value: string) {
  const parsed = parseDateInput(value);
  return toDateInputValue(parsed);
}

function formatDateInput(value: string) {
  const parsed = parseDateInput(value);
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 18, paddingBottom: 26, gap: 14 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { color: '#111827', fontSize: 23, lineHeight: 30, fontWeight: '700' },
  subtitle: { marginTop: 3, color: '#6b7280', fontSize: 13, lineHeight: 19 },
  primaryButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: WebsiteTheme.primary },
  primaryButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  countCard: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 5, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 15, backgroundColor: '#ffffff' },
  countMetric: { flex: 1, alignItems: 'center', gap: 3 },
  count: { color: WebsiteTheme.primary, fontSize: 23, fontWeight: '800' },
  pendingCount: { color: '#d97706', fontSize: 19, fontWeight: '800' },
  countLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  countDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: '#e5e7eb' },
  completedCount: { color: '#059669', fontSize: 19, fontWeight: '800' },
  searchInput: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 13, color: '#111827', backgroundColor: '#ffffff', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 8, paddingRight: 5 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: WebsiteTheme.primary },
  filterText: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  centerState: { paddingVertical: 36 },
  stateCard: { alignItems: 'center', padding: 24, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#ffffff' },
  stateTitle: { color: '#111827', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  stateMessage: { marginTop: 6, color: '#6b7280', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: { marginTop: 14, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f0fdfa' },
  retryText: { color: WebsiteTheme.primary, fontSize: 13, fontWeight: '700' },
  taskCard: { padding: 15, gap: 11, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, backgroundColor: '#ffffff' },
  taskTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  taskTitle: { flex: 1, color: '#111827', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  priorityBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, backgroundColor: '#fff7ed' },
  highPriority: { backgroundColor: '#fef2f2' },
  lowPriority: { backgroundColor: '#ecfdf5' },
  priorityText: { color: '#c2410c', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  highPriorityText: { color: '#dc2626' },
  lowPriorityText: { color: '#059669' },
  description: { color: '#6b7280', fontSize: 13, lineHeight: 19 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metaLabel: { color: '#9ca3af', fontSize: 12 },
  metaValue: { flexShrink: 1, color: '#1f2937', fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'right' },
  taskFooter: { paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 15, backgroundColor: '#fff7ed' },
  completeStatus: { backgroundColor: '#ecfdf5' },
  progressStatus: { backgroundColor: '#eff6ff' },
  statusText: { color: '#c2410c', fontSize: 11, fontWeight: '700' },
  completeStatusText: { color: '#059669' },
  progressStatusText: { color: '#2563eb' },
  taskActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#f0fdfa' },
  secondaryButtonText: { color: WebsiteTheme.primary, fontSize: 12, fontWeight: '700' },
  deleteButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#fef2f2' },
  deleteButtonText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(17, 24, 39, 0.52)' },
  clearModalBackdrop: { backgroundColor: 'transparent' },
  clearFeedbackBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'transparent' },
  feedbackScroll: { width: '100%', flex: 1 },
  feedbackScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  feedbackCard: { width: '100%', maxWidth: 420, alignItems: 'center', padding: 24, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 24, backgroundColor: '#ffffff', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  successFeedbackCard: { maxWidth: 360, maxHeight: '90%', padding: 20, shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  successIcon: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', marginBottom: 17, borderRadius: 31, backgroundColor: '#dcfce7' },
  successIconText: { color: '#15803d', fontSize: 32, lineHeight: 38, fontWeight: '800' },
  feedbackEyebrow: { marginBottom: 7, color: '#16a34a', fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
  feedbackTitle: { color: '#111827', fontSize: 22, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
  feedbackSubtitle: { marginTop: 7, marginBottom: 20, color: '#6b7280', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  feedbackDetails: { width: '100%', padding: 15, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 15, backgroundColor: '#f9fafb' },
  feedbackLabel: { color: '#9ca3af', fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  feedbackValue: { marginTop: 4, color: '#1f2937', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  feedbackDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12, backgroundColor: '#e5e7eb' },
  feedbackPrimaryButton: { width: '100%', alignItems: 'center', marginTop: 18, paddingVertical: 14, borderRadius: 13, backgroundColor: WebsiteTheme.primary },
  feedbackPrimaryText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  deleteIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderRadius: 27, backgroundColor: '#fef2f2' },
  deleteIconText: { color: '#dc2626', fontSize: 28, fontWeight: '800' },
  deleteTaskPreview: { width: '100%', padding: 14, borderWidth: 1, borderColor: '#fee2e2', borderRadius: 14, backgroundColor: '#fff7f7' },
  feedbackActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 20 },
  feedbackCancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, backgroundColor: '#ffffff' },
  feedbackCancelText: { color: '#374151', fontSize: 14, fontWeight: '700' },
  feedbackDeleteButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#dc2626' },
  feedbackDeleteText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 520, maxHeight: '90%', alignSelf: 'center', padding: 20, borderRadius: 20, backgroundColor: '#ffffff' },
  modalTitle: { color: '#111827', fontSize: 20, fontWeight: '800' },
  modalSubtitle: { marginTop: 6, marginBottom: 18, color: '#6b7280', fontSize: 13, lineHeight: 19 },
  fieldLabel: { marginBottom: 6, color: '#374151', fontSize: 13, fontWeight: '700' },
  fieldInput: { marginBottom: 15, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 11, color: '#111827', backgroundColor: '#f9fafb', fontSize: 14 },
  dateButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  dateButton: { flex: 1, minHeight: 46, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb' },
  dateClearButton: { paddingHorizontal: 10, paddingVertical: 10 },
  dateClearText: { color: WebsiteTheme.primary, fontSize: 13, fontWeight: '600' },
  dateButtonText: { color: '#111827', fontSize: 14 },
  dateButtonIcon: { color: WebsiteTheme.primary, fontSize: 18, fontWeight: '700' },
  datePickerContainer: { marginBottom: 15, padding: 8, borderRadius: 12, backgroundColor: '#f9fafb' },
  datePicker: { width: '100%' },
  dateDoneButton: { alignSelf: 'flex-end', marginTop: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: WebsiteTheme.primary },
  dateDoneText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  descriptionInput: { minHeight: 78 },
  selectButton: { marginBottom: 15, paddingHorizontal: 12, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 11, backgroundColor: '#f9fafb' },
  selectText: { color: '#111827', fontSize: 14 },
  selectPlaceholder: { color: '#9ca3af' },
  selectChevron: { color: '#6b7280', fontSize: 16 },
  optionRow: { marginBottom: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#f3f4f6' },
  optionChipActive: { backgroundColor: WebsiteTheme.primary },
  optionText: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  optionTextActive: { color: '#ffffff' },
  editHint: { marginBottom: 8, color: '#9ca3af', fontSize: 11, lineHeight: 16 },
  modalActions: { marginTop: 7, flexDirection: 'row', justifyContent: 'flex-end', gap: 9 },
  modalCancel: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f3f4f6' },
  modalCancelText: { color: '#374151', fontSize: 13, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  assigneeList: { maxHeight: 350, marginVertical: 14 },
  assigneeRow: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  assigneeAvatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#f0fdfa' },
  assigneeInitial: { color: WebsiteTheme.primary, fontSize: 15, fontWeight: '800' },
  assigneeCopy: { flex: 1, gap: 3 },
  assigneeName: { color: '#111827', fontSize: 14, fontWeight: '700' },
  assigneeEmail: { color: '#6b7280', fontSize: 12 },
});
