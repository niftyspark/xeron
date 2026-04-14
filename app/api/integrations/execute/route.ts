export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/composio';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { tool, params } = await req.json();
    if (!tool) return NextResponse.json({ error: 'tool slug is required' }, { status: 400 });

    const result = await executeTool(tool, payload.userId as string, params || {});
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Execute error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute tool' },
      { status: 500 }
    );
  }
}