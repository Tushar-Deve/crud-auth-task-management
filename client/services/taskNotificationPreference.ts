import { useCallback, useSyncExternalStore } from "react";

export type NotificationRole = "admin" | "user";

const preferenceEvent = "task-notification-preference-updated";

function preferenceKey(role: NotificationRole, userId: string | number) {
  return `taskNotificationsEnabled:${role}:${userId}`;
}

export function areTaskNotificationsEnabled(
  role: NotificationRole,
  userId?: string | number | null,
) {
  if (typeof window === "undefined" || userId == null) return true;
  return window.localStorage.getItem(preferenceKey(role, userId)) !== "false";
}

export function setTaskNotificationsEnabled(
  role: NotificationRole,
  userId: string | number | null | undefined,
  enabled: boolean,
) {
  if (typeof window === "undefined" || userId == null) return;
  window.localStorage.setItem(preferenceKey(role, userId), String(enabled));
  window.dispatchEvent(new Event(preferenceEvent));
}

export function onTaskNotificationPreferenceUpdated(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(preferenceEvent, listener);
  return () => window.removeEventListener(preferenceEvent, listener);
}

export function useTaskNotificationPreference(
  role: NotificationRole,
  userId?: string | number | null,
) {
  const subscribe = useCallback(
    (listener: () => void) => onTaskNotificationPreferenceUpdated(listener),
    [],
  );
  const getSnapshot = useCallback(
    () => areTaskNotificationsEnabled(role, userId),
    [role, userId],
  );
  const getServerSnapshot = useCallback(() => true, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
