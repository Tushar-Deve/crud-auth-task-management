import { authenticatedFetch, clearMobileTokens, saveMobileTokens } from '@/services/token-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { resolveApiBaseUrl } from '@/services/api-base-url';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = resolveApiBaseUrl(
  configuredBaseUrl,
  __DEV__,
  Constants.expoConfig?.hostUri,
);

const AUTH_BASE_PATH = '/authRoutes';
const REQUEST_TIMEOUT_MS = 15_000;

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface ProfileResponse {
  success: boolean;
  user: AuthUser;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getRetryAfterSeconds(value: string | null, now = Date.now()): number | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null;
  }

  const retryAt = Date.parse(trimmed);
  if (!Number.isFinite(retryAt)) return null;

  const seconds = Math.ceil((retryAt - now) / 1000);
  return seconds > 0 ? seconds : null;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;

  const user = value as Partial<AuthUser>;
  return (
    (typeof user.id === 'string' || typeof user.id === 'number') &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string'
  );
}

async function requestJson<T>(path: string, token?: string, body?: object): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestInit: RequestInit = {
      method: body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-client-type': 'mobile',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    };
    const response = token
      ? await authenticatedFetch(`${API_BASE_URL}${path}`, requestInit, token)
      : await fetch(`${API_BASE_URL}${path}`, requestInit);

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }

    const result = data && typeof data === 'object' ? (data as { message?: unknown; success?: unknown }) : {};
    if (!response.ok || result.success === false) {
      const message = typeof result.message === 'string' ? result.message : `Request failed (${response.status}).`;
      throw new ApiError(
        message,
        response.status,
        response.status === 429 ? getRetryAfterSeconds(response.headers.get('Retry-After')) : null,
      );
    }

    if (!data || typeof data !== 'object') {
      throw new ApiError('The server returned an unreadable response.', response.status);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.');
    }

    throw new ApiError('Unable to reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function loginRequest(email: string, password: string) {
  const response = await requestJson<LoginResponse>(`${AUTH_BASE_PATH}/login`, undefined, {
    email,
    password,
  });

  if (!response.success || !response.accessToken || !response.refreshToken || !isAuthUser(response.user)) {
    throw new ApiError(response.message || 'The server returned an incomplete login response.');
  }

  await saveMobileTokens(response.accessToken, response.refreshToken);
  return { accessToken: response.accessToken, user: response.user };
}

export async function logoutRequest() {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  try {
    await fetch(`${API_BASE_URL}${AUTH_BASE_PATH}/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-client-type': 'mobile' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Local logout must still complete when the device is offline.
  } finally {
    await clearMobileTokens();
  }
}

export async function getProfile(accessToken: string) {
  const response = await requestJson<ProfileResponse>(`${AUTH_BASE_PATH}/profile`, accessToken);

  if (!response.success || !isAuthUser(response.user)) {
    throw new ApiError('The server returned an incomplete profile response.');
  }

  return response.user;
}
