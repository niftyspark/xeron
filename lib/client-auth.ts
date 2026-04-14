/**
 * Get auth token from client-side storage.
 * Reads from zustand persisted store in localStorage.
 * Used by all hooks that need to make authenticated API calls.
 */
export function getClientToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('xeron-user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.token || null;
    }
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