import { router, usePathname } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { WebsiteTheme } from '@/constants/theme';
import { AppIcon } from '@/components/app-icon';
import { useThemeStyles } from '@/context/app-theme-context';
import { useAuth } from '@/context/auth-context';
import { useNotificationPreferences } from '@/context/notification-preferences-context';
import {
  getAdminTaskHistory,
  getUnreadAdminNotificationCount,
  markAdminNotificationsRead,
  type AdminTaskHistoryItem,
} from '@/services/admin-api';
import {
  getUnreadAssignmentNotifications,
  markAssignmentNotificationsRead,
  type TaskAssignmentNotification,
} from '@/services/user-task-api';

const userItems = [
  { route: 'index', label: 'Home', ios: 'house.fill', android: 'home' },
  { route: 'tasks', label: 'My Tasks', ios: 'checklist', android: 'checklist' },
  { route: 'profile', label: 'Profile', ios: 'person.crop.circle', android: 'person' },
  { route: 'settings', label: 'Settings', ios: 'gearshape.fill', android: 'settings' },
] as const;

const adminItems = [
  { route: 'users', label: 'User Management', ios: 'person.2.fill', android: 'groups' },
  { route: 'tasks', label: 'Task Management', ios: 'checklist', android: 'checklist' },
  { route: 'index', label: 'Home', ios: 'house.fill', android: 'home' },
  { route: 'profile', label: 'Profile', ios: 'person.crop.circle', android: 'person' },
  { route: 'settings', label: 'Settings', ios: 'gearshape.fill', android: 'settings' },
] as const;

type NotificationRefreshOptions = {
  markTaskTabSeen?: boolean;
  markBellNotificationsRead?: boolean;
  markAdminBellSeen?: boolean;
};

export function DashboardTabs() {
  const { user, accessToken } = useAuth();
  const { taskNotificationsEnabled, preferencesLoaded } = useNotificationPreferences();
  const styles = useThemeStyles(baseStyles);
  const isAdmin = user?.role === 'admin';
  const pathname = usePathname();
  const isOnTasksTab = pathname.endsWith('/tasks');
  const [notificationCount, setNotificationCount] = useState(0);
  const [taskTabCount, setTaskTabCount] = useState(0);
  const visibleNotificationCount = preferencesLoaded && taskNotificationsEnabled ? notificationCount : 0;
  const visibleTaskTabCount = preferencesLoaded && taskNotificationsEnabled ? taskTabCount : 0;

  const refreshNotifications = useCallback(async (options: NotificationRefreshOptions = {}) => {
    if (!accessToken || !user) return null;
    if (!preferencesLoaded || !taskNotificationsEnabled) {
      setNotificationCount(0);
      setTaskTabCount(0);
      return user.role === 'admin'
        ? { adminHistory: [], historyError: '' }
        : { userTasks: [] };
    }

    try {
      if (user.role === 'admin') {
        const [countResponse, historyResponse] = await Promise.all([
          getUnreadAdminNotificationCount(accessToken),
          getAdminTaskHistory(accessToken).catch(() => null),
        ]);
        if (!historyResponse) {
          const fallbackCount = Math.max(0, Number(countResponse.count) || 0);
          setTaskTabCount(fallbackCount);
          setNotificationCount(fallbackCount);
          return { adminHistory: [], historyError: 'Could not load completed-task details.' };
        }
        const history = (historyResponse?.history ?? []).filter((item) => item.isRead !== true);
        setTaskTabCount(history.length);

        if (options.markAdminBellSeen || options.markTaskTabSeen) {
          await markAdminNotificationsRead(accessToken);
          setNotificationCount(0);
          setTaskTabCount(0);
          return { adminHistory: getLatestAdminNotification(history), historyError: '' };
        }

        setNotificationCount(Math.max(0, Number(countResponse.count) || history.length));
        return { adminHistory: history, historyError: historyResponse ? '' : 'Could not load completed-task details.' };
      }

      const response = await getUnreadAssignmentNotifications(accessToken);
      const assignmentNotifications = response.notifications;

      const currentNotificationByTaskId = new Map<string, TaskAssignmentNotification>();
      assignmentNotifications.map(normalizeAssignmentNotification).forEach((item) => {
        currentNotificationByTaskId.set(String(item.taskId), item);
      });
      const currentNotifications = [...currentNotificationByTaskId.values()];
      setTaskTabCount(currentNotifications.length);

      if (options.markBellNotificationsRead || options.markTaskTabSeen) {
        await markAssignmentNotificationsRead(accessToken);
        setNotificationCount(0);
        setTaskTabCount(0);
        return { userTasks: getLatestAssignmentNotification(currentNotifications) };
      }

      setNotificationCount(Math.max(0, Number(response.count) || currentNotifications.length));
      return { userTasks: currentNotifications };
    } catch (error) {
      console.warn('Could not refresh task notifications:', error);
      return null;
    }
  }, [accessToken, preferencesLoaded, taskNotificationsEnabled, user]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    const refreshCurrentNotifications = (markTaskTabSeen = false) => refreshNotifications({
      markTaskTabSeen: markTaskTabSeen && isOnTasksTab,
    });
    const initialRefresh = setTimeout(() => { void refreshCurrentNotifications(true); }, 0);
    const refreshTimer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshCurrentNotifications();
    }, 10000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshCurrentNotifications();
    });
    return () => {
      clearTimeout(initialRefresh);
      clearInterval(refreshTimer);
      appStateSubscription.remove();
    };
  }, [isOnTasksTab, preferencesLoaded, refreshNotifications]);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        tabBar={(props) => <DashboardTabBar {...props} taskTabCount={visibleTaskTabCount} />}
        screenOptions={{
          header: () => (
            <AppHeader
              notificationCount={visibleNotificationCount}
              taskNotificationsEnabled={taskNotificationsEnabled}
              preferencesLoaded={preferencesLoaded}
              refreshNotifications={refreshNotifications}
            />
          ),
          sceneStyle: styles.scene,
          tabBarStyle: styles.tabBarContainer,
        }}>
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
        <Tabs.Screen
          name="tasks"
          options={{ title: isAdmin ? 'Task Management' : 'My Tasks' }}
        />
        <Tabs.Screen name="users" options={{ title: 'User Management', href: isAdmin ? undefined : null }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </>
  );
}

function normalizeAssignmentNotification(item: TaskAssignmentNotification): TaskAssignmentNotification {
  const value = item as TaskAssignmentNotification & Record<string, unknown>;
  const firstText = (...candidates: unknown[]) => candidates.find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0,
  );

  return {
    ...item,
    id: item.id ?? value.taskId ?? value.task_id ?? 'unknown',
    taskId: item.taskId ?? value.task_id ?? item.id,
    title: firstText(value.title, value.taskTitle, value.task_title, value.task, value.name) ?? 'New task assigned',
    description: firstText(value.description, value.taskDescription, value.task_description) ?? null,
    priority: firstText(value.priority) ?? null,
    due_date: firstText(value.due_date, value.dueDate, value.dueAt, value.due_at) ?? null,
    createdAt: firstText(value.createdAt, value.created_at, value.assignedAt, value.assigned_at, value.updatedAt, value.updated_at) ?? '',
    assigned_by_name: firstText(value.assigned_by_name, value.assignedByName, value.assigned_by, value.assignedBy) ?? null,
  };
}

function getLatestAssignmentNotification(notifications: TaskAssignmentNotification[]) {
  return [...notifications]
    .sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''))
    .slice(0, 1);
}

function getLatestAdminNotification(notifications: AdminTaskHistoryItem[]) {
  return [...notifications]
    .sort((left, right) => Date.parse(right.updatedAt || '') - Date.parse(left.updatedAt || ''))
    .slice(0, 1);
}

function AppHeader({
  notificationCount,
  taskNotificationsEnabled,
  preferencesLoaded,
  refreshNotifications,
}: {
  notificationCount: number;
  taskNotificationsEnabled: boolean;
  preferencesLoaded: boolean;
  refreshNotifications: (options?: NotificationRefreshOptions) => Promise<{ adminHistory: AdminTaskHistoryItem[]; historyError: string } | { userTasks: TaskAssignmentNotification[] } | null>;
}) {
  const { logout, isLoading, user } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const isAdmin = user?.role === 'admin';
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [visibleUserTasks, setVisibleUserTasks] = useState<TaskAssignmentNotification[]>([]);
  const [visibleAdminHistory, setVisibleAdminHistory] = useState<AdminTaskHistoryItem[]>([]);

  const closeNotifications = () => {
    setNotificationsOpen(false);
    setVisibleUserTasks([]);
    setVisibleAdminHistory([]);
  };

  const openNotifications = async () => {
    setNotificationsOpen(true);
    setVisibleUserTasks([]);
    setVisibleAdminHistory([]);
    if (!taskNotificationsEnabled) {
      setNotificationLoading(false);
      setNotificationError('');
      return;
    }
    setNotificationLoading(true);
    setNotificationError('');
    const result = await refreshNotifications({
      markBellNotificationsRead: !isAdmin,
      markAdminBellSeen: isAdmin,
    });
    if (!result) {
      setNotificationError('Could not load notifications. Check your connection and try again.');
    } else if ('adminHistory' in result) {
      setVisibleAdminHistory(result.adminHistory);
      if (result.historyError) {
        setNotificationError(result.historyError);
      }
    } else {
      setVisibleUserTasks(getLatestAssignmentNotification(result.userTasks));
    }
    setNotificationLoading(false);
  };

  // TEMPORARY: quick dashboard-to-login access for account testing; remove after testing.
  const returnToLoginForTesting = async () => {
    if (isLoading) return;

    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  };

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeading}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Login (temporary testing button)"
              disabled={isLoading}
              onPress={returnToLoginForTesting}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
              <AppIcon
                name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
                size={20}
                tintColor="#ffffff"
              />
            </Pressable>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>TM</Text>
              </View>
              <Text numberOfLines={1} style={styles.headerTitle}>Task Management</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!preferencesLoaded}
            accessibilityLabel={notificationCount > 0 ? `Notifications, ${notificationCount} unread` : 'Notifications'}
            onPress={() => { void openNotifications(); }}
            style={styles.bellButton}>
            <AppIcon
              name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
              size={21}
              tintColor="#ffffff"
            />
            {notificationCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={notificationsOpen} transparent animationType="slide" onRequestClose={closeNotifications}>
        <View style={styles.notificationsBackdrop}>
          <View style={styles.notificationsCard}>
            <View style={styles.notificationsHeader}>
              <View style={styles.notificationsHeading}>
                <Text style={styles.notificationsTitle}>Notifications</Text>
                <Text style={styles.notificationsSubtitle}>
                  {!taskNotificationsEnabled
                    ? 'Task notifications are turned off in Settings.'
                    : isAdmin ? 'Recent task completions from your team.' : 'Tasks newly assigned to you.'}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close notifications" onPress={closeNotifications} style={styles.closeNotificationsButton}>
                <Text style={styles.closeNotificationsText}>×</Text>
              </Pressable>
            </View>
            {notificationError ? <Text style={styles.notificationError}>{notificationError}</Text> : null}
            <ScrollView style={styles.notificationList} contentContainerStyle={styles.notificationListContent}>
              {notificationLoading ? <ActivityIndicator style={styles.notificationLoading} color={WebsiteTheme.primary} /> : null}
              {!taskNotificationsEnabled ? (
                <Text style={styles.notificationEmpty}>Turn on Task notifications in Settings to see updates here.</Text>
              ) : null}
              {taskNotificationsEnabled && !notificationLoading && !notificationError && isAdmin && visibleAdminHistory.length === 0 ? (
                <Text style={styles.notificationEmpty}>No completed-task notifications yet.</Text>
              ) : null}
              {taskNotificationsEnabled && !notificationLoading && !isAdmin && visibleUserTasks.length === 0 ? (
                <Text style={styles.notificationEmpty}>No new task assignments.</Text>
              ) : null}
              {taskNotificationsEnabled && !notificationLoading && isAdmin ? visibleAdminHistory.slice(0, 30).map((item) => (
                <Pressable key={item.id} onPress={() => { setNotificationsOpen(false); router.navigate('/(authenticated)/tasks'); }} style={styles.notificationItem}>
                  <View style={[styles.notificationIcon, styles.completedNotificationIcon]}>
                    <AppIcon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={17} tintColor="#047857" />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text numberOfLines={1} style={styles.notificationItemTitle}>{item.task || 'Task completed'}</Text>
                    <Text numberOfLines={2} style={styles.notificationItemMessage}>{item.userName || 'A team member'} completed this task.</Text>
                    <Text style={styles.notificationTime}>{formatNotificationDate(item.updatedAt)}</Text>
                  </View>
                </Pressable>
              )) : null}
      {taskNotificationsEnabled && !notificationLoading && !isAdmin ? visibleUserTasks.map((task) => (
                <Pressable key={String(task.id)} onPress={() => { closeNotifications(); router.navigate('/(authenticated)/tasks'); }} style={styles.notificationItem}>
                  <View style={styles.notificationIcon}>
                    <AppIcon name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }} size={17} tintColor={WebsiteTheme.primary} />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text numberOfLines={1} style={styles.notificationItemTitle}>{task.title || 'New task assigned'}</Text>
                    <Text numberOfLines={1} style={styles.notificationItemMessage}>
                      Assigned by {task.assigned_by_name || 'Administrator'}
                    </Text>
                    {task.description ? <Text numberOfLines={2} style={styles.notificationItemDetail}>{task.description}</Text> : null}
                    {task.priority ? <Text style={styles.notificationTime}>Priority: {task.priority[0].toUpperCase()}{task.priority.slice(1)}</Text> : null}
                    <Text style={styles.notificationTime}>Assigned: {formatNotificationDate(task.createdAt)}</Text>
                    {task.due_date ? <Text style={styles.notificationTime}>Due: {formatNotificationDate(task.due_date)}</Text> : null}
                  </View>
                </Pressable>
              )) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function DashboardTabBar({ state, emitter, navigateToTab, taskTabCount }: BottomTabBarProps & { taskTabCount: number }) {
  const { user } = useAuth();
  const styles = useThemeStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';
  const items = isAdmin ? adminItems : userItems;

  return (
    <View style={[
      styles.tabBarSafeArea,
      {
        paddingBottom: Math.max(insets.bottom, 12),
        paddingLeft: Math.max(insets.left, 16),
        paddingRight: Math.max(insets.right, 16),
      },
    ]}>
      <View style={[styles.tabBar, isAdmin && styles.adminTabBar]}>
        {items.map((item) => {
          const routeIndex = state.routes.findIndex((route) => route.name === item.route);
          const route = state.routes[routeIndex];
          const focused = state.index === routeIndex;
          if (!route) return null;

          return (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [
                styles.tabItem,
                focused && styles.selectedTabItem,
                pressed && styles.tabPressed,
              ]}>
              <View style={styles.tabIcon}>
                <AppIcon
                  name={{ ios: item.ios, android: item.android, web: item.android }}
                  size={20}
                  tintColor={focused ? '#ffffff' : '#64748b'}
                />
                {item.route === 'tasks' && taskTabCount > 0 ? (
                  <View style={styles.taskTabBadge}>
                    <Text style={styles.taskTabBadgeText}>{taskTabCount > 99 ? '99+' : taskTabCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={2}
                style={[styles.tabLabel, isAdmin && styles.adminTabLabel, focused && styles.selectedTabLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DashboardMessage({ title, message }: { title: string; message: string }) {
  const styles = useThemeStyles(baseStyles);
  return (
    <View style={styles.messageScreen}>
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>{title}</Text>
        <Text style={styles.messageText}>{message}</Text>
      </View>
    </View>
  );
}

function formatNotificationDate(value?: string | null) {
  if (!value) return 'Just now';
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]), 12)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateOnlyMatch
    ? date.toLocaleDateString(undefined, { dateStyle: 'medium' })
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const baseStyles = StyleSheet.create({
  scene: { backgroundColor: '#f9fafb' },
  headerSafeArea: {
    backgroundColor: WebsiteTheme.primary,
    borderBottomColor: WebsiteTheme.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 900,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  headerLeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  backButton: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  backButtonPressed: { backgroundColor: 'rgba(255, 255, 255, 0.24)', opacity: 0.8 },
  brandMark: {
    width: 36,
    height: 36,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  brandMarkText: { color: '#111827', fontSize: 15, fontWeight: '900', letterSpacing: -0.6 },
  headerTitle: { flexShrink: 1, color: '#ffffff', fontSize: 18, fontWeight: '700', letterSpacing: -0.25 },
  bellButton: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -1,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: WebsiteTheme.primary,
    backgroundColor: '#dc2626',
  },
  notificationBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800' },
  notificationsBackdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(15, 23, 42, 0.56)' },
  notificationsCard: { width: '100%', height: '78%', maxWidth: 520, maxHeight: '84%', alignSelf: 'center', overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  notificationsHeader: { paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  notificationsHeading: { flex: 1, gap: 3 },
  notificationsTitle: { color: '#111827', fontSize: 19, fontWeight: '800' },
  notificationsSubtitle: { color: '#6b7280', fontSize: 12, lineHeight: 17 },
  closeNotificationsButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f3f4f6' },
  closeNotificationsText: { color: '#4b5563', fontSize: 24, lineHeight: 27, fontWeight: '400' },
  notificationError: { marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 10, color: '#b91c1c', backgroundColor: '#fef2f2', fontSize: 12 },
  notificationList: { flex: 1 },
  notificationListContent: { padding: 12, gap: 8 },
  notificationLoading: { paddingVertical: 28 },
  notificationEmpty: { paddingHorizontal: 12, paddingVertical: 30, color: '#6b7280', fontSize: 13, textAlign: 'center' },
  notificationItem: { minHeight: 72, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 15, backgroundColor: '#ffffff' },
  notificationIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#f0fdfa' },
  completedNotificationIcon: { backgroundColor: '#ecfdf5' },
  notificationCopy: { flex: 1, minWidth: 0, gap: 3 },
  notificationItemTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  notificationItemMessage: { color: '#4b5563', fontSize: 11, lineHeight: 15 },
  notificationItemDetail: { color: '#6b7280', fontSize: 11, lineHeight: 15 },
  notificationTime: { color: '#9ca3af', fontSize: 10 },
  tabBarSafeArea: {
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabBarContainer: {
    backgroundColor: '#f9fafb',
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
  },
  tabBar: {
    minHeight: 70,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: { shadowColor: '#93c5fd', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4, shadowColor: '#93c5fd' },
      default: { boxShadow: '0px 4px 14px rgba(96, 165, 250, 0.18)' },
    }),
  },
  adminTabBar: { maxWidth: 760, paddingHorizontal: 5 },
  tabItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 3,
    paddingVertical: 5,
    borderRadius: 21,
  },
  selectedTabItem: {
    backgroundColor: WebsiteTheme.primary,
    ...Platform.select({
      ios: { shadowColor: WebsiteTheme.primary, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 4, shadowColor: WebsiteTheme.primary },
      default: { boxShadow: '0px 3px 9px rgba(15, 118, 110, 0.24)' },
    }),
  },
  tabPressed: { opacity: 0.65 },
  tabIcon: {
    position: 'relative',
    width: 38,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  taskTabBadge: { position: 'absolute', top: -5, right: -7, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1.5, borderColor: '#ffffff', backgroundColor: '#dc2626' },
  taskTabBadgeText: { color: '#ffffff', fontSize: 8, lineHeight: 10, fontWeight: '800' },
  tabLabel: { maxWidth: '100%', color: '#475569', fontSize: 10, lineHeight: 12, fontWeight: '500', textAlign: 'center' },
  selectedTabLabel: { color: '#ffffff', fontWeight: '700' },
  adminTabLabel: { fontSize: 9.5, lineHeight: 11, flexShrink: 1 },
  messageScreen: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  messageCard: {
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  messageTitle: { color: '#111827', fontSize: 23, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  messageText: { marginTop: 8, color: '#6b7280', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
