import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from './auth';
import { isDbAvailable } from './db';

/**
 * Validates auth and DB availability for API routes.
 * Returns the userId if valid, or a NextResponse error.
 */
export async function requireAuth(headers: Headers): Promise<
  { userId: string } | NextResponse
> {
  if (!isDbAvailable()) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  const token = getTokenFromHeaders(headers);
  if (!token) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }

  return { userId: payload.userId as string };
}