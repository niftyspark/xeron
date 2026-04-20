/**
 * Client-side auth helpers.
 *
 * After the auth hardening, the JWT lives in an httpOnly cookie — JS cannot
 * read it. `fetch` includes the cookie automatically as long as the request
 * is same-origin (which all /api calls are), so client code no longer needs
 * to attach Authorization headers. `authFetch()` is a thin wrapper that sets
 * credentials: 'include' for clarity and standard JSON headers.
 */

export interface AuthFetchInit extends Omit<RequestInit, 'credentials'> {
  json?: unknown;
}

/**
 * fetch() wrapper for authenticated API calls. Same-origin by default, so the
 * httpOnly xeron_token cookie is attached automatically by the browser.
 *
 * Pass `json` to serialize a body with application/json — convenient and
 * avoids forgetting Content-Type.
 */
export async function authFetch(input: RequestInfo | URL, init: AuthFetchInit = {}) {
  const { json, headers, body, ...rest } = init;
  const finalHeaders = new Headers(headers);
  let finalBody = body;

  if (json !== undefined) {
    finalBody = JSON.stringify(json);
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json');
    }
  }

  return fetch(input, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
    credentials: 'same-origin',
  });
}

/**
 * Retained named exports so any straggling callers compile — they become
 * no-ops that return an empty header set. Once all call-sites migrate to
 * authFetch(), these can be removed.
 *
 * @deprecated Use authFetch() instead. The cookie is attached automatically.
 */
export function getAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

/**
 * @deprecated The token is httpOnly and unreadable from JS. This function now
 * returns null unconditionally. Call-sites that depended on token presence
 * for gating UI should instead rely on a server-provided `/api/user` probe.
 */
export function getClientToken(): string | null {
  return null;
}
