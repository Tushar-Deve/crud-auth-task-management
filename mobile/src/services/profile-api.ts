import { API_BASE_URL } from '@/services/auth-api';
import { authenticatedFetch } from '@/services/token-session';

export async function changeAccountPassword(token: string, oldPassword: string, newPassword: string) {
  const response = await authenticatedFetch(`${API_BASE_URL}/authRoutes/change-password`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  }, token);

  let data: { success?: boolean; message?: string } | null = null;
  try {
    data = await response.json();
  } catch {
    // The server may return an empty response for an error.
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || `Could not change password (${response.status}).`);
  }

  return data;
}
