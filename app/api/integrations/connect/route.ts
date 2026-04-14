export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { initiateConnection } from '@/lib/composio';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { toolkit } = await req.json();
    if (!toolkit) return NextResponse.json({ error: 'toolkit is required' }, { status: 400 });

    const connectionRequest = await initiateConnection(payload.userId as string, toolkit);

    return NextResponse.json({ connectionRequest });
  } catch (error: any) {
    console.error('Connect error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}