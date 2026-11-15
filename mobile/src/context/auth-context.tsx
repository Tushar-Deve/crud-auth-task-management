import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError, getProfile, loginRequest, logoutRequest, type AuthUser } from '@/services/auth-api';
import { subscribeToSessionExpired, subscribeToTokenRefreshed } from '@/services/session-events';
import { clearMobileTokens, refreshMobileAccessToken } from '@/services/token-session';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  hasStoredToken: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  startupError: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const SecureStore = await import('expo-secure-store');
        const storedToken = await SecureStore.getItemAsync('accessToken');
        if (!storedToken) return;
        if (active) setHasStoredToken(true);

        try {
          const profile = await getProfile(storedToken);
          const SecureStore = await import('expo-secure-store');
          const currentToken = await SecureStore.getItemAsync('accessToken');
          if (active) {
            setAccessToken(currentToken || storedToken);
            setUser(profile);
          }
        } catch (error) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            await clearMobileTokens();
          } else if (active) {
            setStartupError(error instanceof Error ? error.message : 'Could not validate the saved session.');
          }
        }
      } catch {
        if (active) setStartupError('Could not restore the saved session. Please sign in again.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    let expiryTime: number;
    try {
      const payloadPart = accessToken.split('.')[1];
      if (!payloadPart) throw new Error('Invalid access token.');
      const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      const payload = JSON.parse(globalThis.atob(paddedPayload)) as { exp?: number };
      if (typeof payload.exp !== 'number') throw new Error('Token expiry is missing.');

      expiryTime = payload.exp * 1000;
      const remainingMs = expiryTime - Date.now();
      if (remainingMs <= 0) {
        void refreshMobileAccessToken().then((token) => {
          if (!token) setSessionExpired(true);
        });
        return;
      }

      const timer = setTimeout(() => {
        void refreshMobileAccessToken().then((token) => {
          if (!token) setSessionExpired(true);
        });
      }, Math.max(0, remainingMs - 30_000));
      const appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active' && Date.now() >= expiryTime - 30_000) {
          void refreshMobileAccessToken().then((token) => {
            if (!token) setSessionExpired(true);
          });
        }
      });
      return () => {
        clearTimeout(timer);
        appStateSubscription.remove();
      };
    } catch {
      void refreshMobileAccessToken().then((token) => {
        if (!token) setSessionExpired(true);
      });
    }
  }, [accessToken]);

  const login = useCallback(async (email: string, password: string) => {
    if (requestInProgress.current) throw new Error('A sign-in request is already in progress.');
    requestInProgress.current = true;
    setIsLoading(true);
    setStartupError(null);

    try {
      const result = await loginRequest(email, password);
      setAccessToken(result.accessToken);
      setHasStoredToken(true);
      setUser(result.user);
      setSessionExpired(false);
      return result.user;
    } finally {
      requestInProgress.current = false;
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setHasStoredToken(false);
      setUser(null);
      setStartupError(null);
      setSessionExpired(false);
      requestInProgress.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => subscribeToSessionExpired(() => setSessionExpired(true)), []);
  useEffect(() => subscribeToTokenRefreshed((token) => setAccessToken(token)), []);

  return (
    <AuthContext.Provider value={{ user, accessToken, hasStoredToken, isLoading, sessionExpired, startupError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
