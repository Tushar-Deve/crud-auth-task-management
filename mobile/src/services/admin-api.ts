import { API_BASE_URL } from '@/services/auth-api';
import { authenticatedFetch } from '@/services/token-session';

export interface ManagedUser {
  id: number | string;
  name: string;
  email: string;
  role: 'admin' | 'user' | string;
  createdAt?: string;
}

export interface ManagedTask {
  id: number | string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  due_date?: string | null;
  assigned_to?: number | string | null;
  assigned_by?: number | string | null;
  assigned_to_name?: string | null;
  assigned_by_name?: string | null;
}

export interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
  };
  recentTasks: ManagedTask[];
  recentUsers: ManagedUser[];
}

export interface AdminTaskHistoryItem {
  id: number | string;
  taskId: number | string;
  task?: string | null;
  userName?: string | null;
  status: string;
  updatedAt: string;
  isRead?: boolean;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, token: string, method = 'GET', body?: object | FormData): Promise<T> {
  const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body && !isMultipart ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? (isMultipart ? body : JSON.stringify(body)) as BodyInit : undefined,
  }, token);

  let data: ApiResponse | null = null;
  try {
    data = await response.json() as ApiResponse;
  } catch {
    // Surface a useful generic message for non-JSON server responses.
  }

  if (!response.ok || data?.success === false) {
    throw new ApiRequestError(data?.message || `Request failed (${response.status}).`, response.status);
  }

  if (!data) throw new Error('The server returned an unreadable response.');
  return data as T;
}

export async function getAdminUsers(token: string) {
  return request<{ users: ManagedUser[] }>('/adminRoutes/getAllUsers', token);
}

export async function getAdminDashboard(token: string) {
  return request<AdminDashboardData>('/adminRoutes/dashboard', token);
}

export async function createAdminUser(token: string, input: { name: string; email: string; password: string }) {
  return request<{ user: ManagedUser; message?: string }>('/adminRoutes/createUser', token, 'POST', input);
}

export async function updateAdminUser(token: string, id: string | number, input: { name: string; email: string }) {
  return request<{ user: ManagedUser; message?: string }>(`/adminRoutes/updateUser/${id}`, token, 'PUT', input);
}

export async function deleteAdminUser(token: string, id: string | number) {
  return request<{ message?: string }>(`/adminRoutes/deleteUser/${id}`, token, 'DELETE');
}

export async function getUsersForReassignment(token: string, id: string | number) {
  return request<{ users: Pick<ManagedUser, 'id' | 'name' | 'email'>[] }>(`/adminRoutes/reassignUsers/${id}`, token);
}

export async function transferTasksAndDeleteUser(token: string, id: string | number, transferToUserId: string | number) {
  return request<{ message?: string }>(`/adminRoutes/transferAndDelete/${id}`, token, 'POST', { transferToUserId });
}

export async function getAdminTasks(token: string) {
  return request<{ tasks: ManagedTask[] }>('/taskRoutes/gettask', token);
}

export async function getUnreadAdminNotificationCount(token: string) {
  return request<{ count: number }>('/taskRoutes/taskhistory/unread-count', token);
}

export async function getAdminTaskHistory(token: string) {
  return request<{ history: AdminTaskHistoryItem[] }>('/taskRoutes/gettaskhistory', token);
}

export async function markAdminNotificationsRead(token: string) {
  return request<{ count: number; message?: string }>('/taskRoutes/taskhistory/mark-read', token, 'PATCH');
}

export async function createAdminTask(token: string, input: {
  title: string;
  description: string;
  priority: ManagedTask['priority'];
  due_date: string | null;
  assignedTo: string;
}) {
  const body = new FormData();
  body.append('title', input.title);
  body.append('description', input.description);
  body.append('priority', input.priority);
  if (input.due_date) body.append('due_date', input.due_date);
  body.append('assignedTo', input.assignedTo);
  return request<{ task: ManagedTask; message?: string }>('/taskRoutes/createtask', token, 'POST', body);
}

export async function updateAdminTask(token: string, id: string | number, input: {
  title?: string;
  description?: string;
  status?: ManagedTask['status'];
}) {
  return request<{ task: ManagedTask; message?: string }>(`/taskRoutes/updatetask/${id}`, token, 'PATCH', input);
}

export async function deleteAdminTask(token: string, id: string | number) {
  return request<{ message?: string }>(`/taskRoutes/deletetask/${id}`, token, 'DELETE');
}
