export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { buildClearAuthCookieOptions } from '@/lib/auth';

/**
 * POST /api/auth/logout
 *
 * Clears the httpOnly session cookie server-side. (A proper JTI revocation
 * list requires Redis / DB state and is deferred; until then, the cookie
 * clear is the authoritative logout for the browser session.)
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...buildClearAuthCookieOptions(), value: '' });
  return response;
}
