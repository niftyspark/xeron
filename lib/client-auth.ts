/**
 * Get auth token from client-side storage.
 * Checks multiple sources to ensure we always find the token if it exists.
 */
export function getClientToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Source 1: zustand persisted store in localStorage
  try {
    const raw = localStorage.getItem('xeron-user');
    if (raw) {
      const parsed = JSON.parse(raw);
      const t = parsed?.state?.token;
      if (t && typeof t === 'string' && t.includes('.')) return t;
    }
  } catch {}

  // Source 2: try to read from zustand store directly (if hydrated)
  try {
    const { useUser } = require('@/app/store/useUser');
    const t = useUser.getState().token;
    if (t && typeof t === 'string' && t.includes('.')) return t;
  } catch {}

  return null;
}

/**
 * Get auth headers for API calls.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getClientToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}