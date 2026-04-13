export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, payload.userId),
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName,
      ensName: user.ensName,
      avatarUrl: user.avatarUrl,
      preferredModel: user.preferredModel,
      settings: user.settings,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const updates: any = {};

    if (body.displayName) updates.displayName = body.displayName;
    if (body.preferredModel) updates.preferredModel = body.preferredModel;
    if (body.settings) updates.settings = body.settings;
    updates.updatedAt = new Date();

    await db.update(schema.users).set(updates).where(eq(schema.users.id, payload.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Delete user - cascades will handle related data (conversations, memories, etc.)
    await db.delete(schema.users).where(eq(schema.users.id, payload.userId));

    return NextResponse.json({ success: true, deleted: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
