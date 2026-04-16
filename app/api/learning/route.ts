export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { ensureTables } from '@/lib/ensure-tables';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await ensureTables();
    const logs = await db.query.learningLogs.findMany({
      where: eq(schema.learningLogs.userId, payload.userId),
      orderBy: [desc(schema.learningLogs.createdAt)],
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error('Learning GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await ensureTables();
    const body = await req.json();
    const { trigger, lesson, appliedTo, confidence } = body;

    if (!lesson) {
      return NextResponse.json({ error: 'lesson is required' }, { status: 400 });
    }

    const [entry] = await db
      .insert(schema.learningLogs)
      .values({
        userId: payload.userId,
        trigger: trigger || 'manual',
        lesson,
        appliedTo: appliedTo || null,
        confidence: confidence ?? 0.5,
      })
      .returning();

    return NextResponse.json(entry);
  } catch (err) {
    console.error('Learning POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
