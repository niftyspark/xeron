export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '@/lib/auth';
import { ensureTables } from '@/lib/ensure-tables';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Skip if not configured
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();

    const { credential, turnstileToken } = await req.json();
    if (!credential) {
      return NextResponse.json({ error: 'Google credential is required' }, { status: 400 });
    }

    // Verify Cloudflare Turnstile (if configured)
    if (process.env.TURNSTILE_SECRET_KEY && turnstileToken) {
      const turnstileValid = await verifyTurnstile(turnstileToken);
      if (!turnstileValid) {
        return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 403 });
      }
    }

    // Verify the Google ID token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || null;

    // Use email as the wallet_address field (it's unique, serves as user identifier)
    let user = await db.query.users.findFirst({
      where: eq(users.walletAddress, email),
    });

    if (!user) {
      const [newUser] = await db.insert(users)
        .values({
          walletAddress: email,
          displayName: name,
          avatarUrl: picture,
          settings: { authMethod: 'google', googleEmail: email },
        })
        .returning();
      user = newUser;
    }

    const token = await signToken({ userId: user.id, walletAddress: user.walletAddress });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Google authentication failed' },
      { status: 500 }
    );
  }
}