import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { guestId } = await req.json().catch(() => ({}));
    
    let user;
    
    if (guestId) {
      user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, guestId),
      });
    }
    
    if (!user) {
      const guestAddress = `0x${Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
      
      const [newUser] = await db.insert(users)
        .values({
          walletAddress: guestAddress,
          displayName: `Guest_${Math.floor(Math.random() * 10000)}`,
          settings: { isGuest: true },
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
      },
    });
  } catch (error) {
    console.error('Guest auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}