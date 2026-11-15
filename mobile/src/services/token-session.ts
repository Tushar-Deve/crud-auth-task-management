import * as SecureStore from 'expo-secure-store';

import { notifySessionExpired, notifyTokenRefreshed } from '@/services/session-events';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.trim() || 'https://crud-auth-task-management.onrender.com')
  .replace(/\/+$/, '')
  .replace(/\/authRoutes$/i, '');

let refreshInProgress: Promise<string | null> | null = null;

export async function saveMobileTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function clearMobileTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function refreshMobileAccessToken(): Promise<string | null> {
  if (!refreshInProgress) {
    refreshInProgress = (async () => {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/authRoutes/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-client-type': 'mobile' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await response.json().catch(() => null) as { accessToken?: string; refreshToken?: string } | null;
      if (!response.ok || !data?.accessToken || !data.refreshToken) return null;

      await saveMobileTokens(data.accessToken, data.refreshToken);
      notifyTokenRefreshed(data.accessToken);
      return data.accessToken;
    })().catch(() => null).finally(() => {
      refreshInProgress = null;
    });
  }
  return refreshInProgress;
}

export async function authenticatedFetch(url: string, init: RequestInit, token: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('x-client-type', 'mobile');

  const response = await fetch(url, { ...init, headers });
  if (response.status !== 401) return response;

  const refreshedToken = await refreshMobileAccessToken();
  if (!refreshedToken) {
    await clearMobileTokens();
    notifySessionExpired();
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
  retryHeaders.set('x-client-type', 'mobile');
  const retryResponse = await fetch(url, { ...init, headers: retryHeaders });
  if (retryResponse.status === 401) {
    await clearMobileTokens();
    notifySessionExpired();
  }
  return retryResponse;
}
