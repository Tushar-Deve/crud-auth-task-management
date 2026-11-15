const listeners = new Set<() => void>();
const tokenListeners = new Set<(token: string) => void>();

export function notifySessionExpired() {
  listeners.forEach((listener) => listener());
}

export function subscribeToSessionExpired(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyTokenRefreshed(token: string) {
  tokenListeners.forEach((listener) => listener(token));
}

export function subscribeToTokenRefreshed(listener: (token: string) => void) {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}
