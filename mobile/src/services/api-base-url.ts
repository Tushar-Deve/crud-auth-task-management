const PRODUCTION_API_BASE_URL = 'https://crud-auth-task-management.onrender.com';
const LOCAL_API_PORT = 5000;

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '').replace(/\/authRoutes$/i, '');
}

function developmentApiBaseUrl(hostUri?: string | null) {
  if (!hostUri) return `http://localhost:${LOCAL_API_PORT}`;

  try {
    const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
    return `http://${host}:${LOCAL_API_PORT}`;
  } catch {
    return `http://localhost:${LOCAL_API_PORT}`;
  }
}

export function resolveApiBaseUrl(
  configuredBaseUrl: string | undefined,
  isDevelopment: boolean,
  developmentHostUri?: string | null,
) {
  const configured = configuredBaseUrl?.trim();
  if (configured) return normalizeBaseUrl(configured);
  if (!isDevelopment) return PRODUCTION_API_BASE_URL;
  return developmentApiBaseUrl(developmentHostUri);
}
