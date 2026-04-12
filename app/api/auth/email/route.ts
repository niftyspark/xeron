import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, isSignup } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.walletAddress, email.toLowerCase()),
    });
    
    if (isSignup && existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }
    
    if (!isSignup && !existing) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }
    
    let user;
    
    if (existing) {
      user = existing;
    } else {
      const [newUser] = await db.insert(users)
        .values({
          walletAddress: email.toLowerCase(),
          displayName: email.split('@')[0],
          settings: { isEmail: true },
        })
        .returning();
      
      user = newUser;
    }
    
    const token = signToken({ userId: user.id, address: user.walletAddress });
    
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
      },
      magicLinkSent: true,
    });
  } catch (error) {
    console.error('Email auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}