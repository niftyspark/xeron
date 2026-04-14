export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { signToken } from '@/lib/auth';
import { verifyMessage } from 'viem';
import { ensureTables } from '@/lib/ensure-tables';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Server configuration error. Please contact admin.' },
        { status: 503 }
      );
    }
    await ensureTables();
    const { address, signature, message } = await req.json();

    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(schema.users.walletAddress, address.toLowerCase()),
    });

    if (!user) {
      const [newUser] = await db
        .insert(schema.users)
        .values({
          walletAddress: address.toLowerCase(),
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        })
        .returning();
      user = newUser;
    }

    // Generate JWT
    const token = await signToken({
      userId: user.id,
      walletAddress: user.walletAddress,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
      },
    });
  } catch (err: any) {
    console.error('Auth error:', err);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
