export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { signToken } from '@/lib/auth';
import { ensureTables } from '@/lib/ensure-tables';

export async function POST(req: NextRequest) {
  try {
    await ensureTables();

    const guestAddress = `0x${Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
    
    const [user] = await db.insert(users)
      .values({
        walletAddress: guestAddress,
        displayName: `Guest_${Math.floor(Math.random() * 10000)}`,
        settings: { isGuest: true },
      })
      .returning();
    
    const token = await signToken({ userId: user.id, walletAddress: user.walletAddress });
    
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error: any) {
    console.error('Guest auth error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Auth failed' }, { status: 500 });
  }
}