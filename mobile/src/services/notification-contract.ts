export interface TaskAssignmentNotification {
  id: number | string;
  taskId: number | string;
  title: string;
  description?: string | null;
  priority?: string | null;
  due_date?: string | null;
  createdAt: string;
  assigned_by_name?: string | null;
}

export interface TaskAssignmentNotificationResponse {
  count: number;
  notifications: TaskAssignmentNotification[];
}

export const ASSIGNMENT_NOTIFICATIONS_PATH = '/taskRoutes/taskhistory/assignments/unread';

export async function loadTaskAssignmentNotifications(
  token: string,
  request: (path: string, token: string) => Promise<unknown>,
): Promise<TaskAssignmentNotificationResponse> {
  const response = await request(ASSIGNMENT_NOTIFICATIONS_PATH, token);
  return parseTaskAssignmentNotificationResponse(response);
}

export function parseTaskAssignmentNotificationResponse(value: unknown): TaskAssignmentNotificationResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('The server returned invalid assignment notifications.');
  }

  const response = value as { count?: unknown; notifications?: unknown };
  if (!Array.isArray(response.notifications)
    || typeof response.count !== 'number'
    || !Number.isSafeInteger(response.count)
    || response.count < 0) {
    throw new Error('The server returned invalid assignment notifications.');
  }

  return {
    count: response.count,
    notifications: response.notifications as TaskAssignmentNotification[],
  };
}
