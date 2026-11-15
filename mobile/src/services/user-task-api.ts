import { API_BASE_URL } from '@/services/auth-api';
import { authenticatedFetch } from '@/services/token-session';
import {
  loadTaskAssignmentNotifications,
  type TaskAssignmentNotificationResponse,
} from '@/services/notification-contract';

export type UserTaskStatus = 'pending' | 'in-progress' | 'completed';

export interface UserTask {
  id: string | number;
  title: string;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  created_at?: string | null;
  assigned_by_name?: string | null;
  assignedBy?: string | null;
  attachments?: { id: string | number; fileUrl: string }[];
}

export type { TaskAssignmentNotification, TaskAssignmentNotificationResponse } from '@/services/notification-contract';

export class UserTaskApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'UserTaskApiError';
  }
}

async function request<T>(path: string, token: string, method = 'GET', body?: object): Promise<T> {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  }, token);

  let data: { success?: boolean; message?: string } & Record<string, unknown>;
  try {
    data = await response.json() as typeof data;
  } catch {
    if (response.status === 401) {
      throw new UserTaskApiError('Your session has expired. Please log in again.', 401);
    }
    throw new Error('The server returned an unreadable response.');
  }

  if (!response.ok || data.success === false) {
    throw new UserTaskApiError(data.message || `Request failed (${response.status}).`, response.status);
  }
  return data as T;
}

export function getMyTasks(token: string) {
  return request<{ tasks: UserTask[] }>('/taskRoutes/gettask', token);
}

export async function downloadTaskAttachment(token: string, attachmentId: string | number) {
  const id = String(attachmentId);
  if (!/^\d+$/.test(id)) {
    throw new UserTaskApiError('Attachment not found.', 404);
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/taskRoutes/attachments/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/pdf' },
  }, token);

  if (!response.ok) {
    let message = 'Could not download this attachment.';
    try {
      const data = await response.json() as { message?: string };
      if (typeof data.message === 'string') message = data.message;
    } catch {
      // Keep the safe generic message when the server response is not JSON.
    }
    throw new UserTaskApiError(message, response.status);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/pdf') {
    throw new Error('The server returned an unsupported attachment type.');
  }
  return new Uint8Array(await response.arrayBuffer());
}

let unreadAssignmentRequest: { token: string; promise: Promise<TaskAssignmentNotificationResponse> } | null = null;

export function getUnreadAssignmentNotifications(token: string) {
  if (unreadAssignmentRequest?.token === token) return unreadAssignmentRequest.promise;

  const promise = loadTaskAssignmentNotifications(token, (path, requestToken) =>
    request<unknown>(path, requestToken),
  )
    .finally(() => {
      if (unreadAssignmentRequest?.promise === promise) unreadAssignmentRequest = null;
    });
  unreadAssignmentRequest = { token, promise };
  return promise;
}

export function markAssignmentNotificationsRead(token: string) {
  return request<{ count: number }>('/taskRoutes/taskhistory/assignments/mark-read', token, 'PATCH');
}

export function completeMyTask(token: string, id: string | number) {
  return request<{ task: UserTask; message?: string }>(`/taskRoutes/updatetask/${id}`, token, 'PATCH', {
    status: 'completed',
  });
}
