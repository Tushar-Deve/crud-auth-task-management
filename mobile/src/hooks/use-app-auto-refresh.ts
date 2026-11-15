import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';

export function useAppAutoRefresh(
  onRefresh: () => void | Promise<unknown>,
  intervalMs = 10000,
  enabled = true,
) {
  const hasFocusedRef = useRef(false);

  useFocusEffect(useCallback(() => {
    if (!enabled) return;

    let isFocused = true;
    let requestInProgress = false;

    const refresh = () => {
      const appState = AppState.currentState;
      if (
        !isFocused ||
        requestInProgress ||
        appState === 'background' ||
        appState === 'inactive'
      ) {
        return;
      }

      requestInProgress = true;
      void Promise.resolve(onRefresh())
        .catch((error) => console.warn('Automatic refresh failed:', error))
        .finally(() => {
          requestInProgress = false;
        });
    };

    // Existing screen effects handle the first load; refresh when returning later.
    if (hasFocusedRef.current) refresh();
    else hasFocusedRef.current = true;

    const refreshTimer = setInterval(refresh, intervalMs);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      isFocused = false;
      clearInterval(refreshTimer);
      appStateSubscription.remove();
    };
  }, [enabled, intervalMs, onRefresh]));
}
