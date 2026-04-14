export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getConnectedAccounts, deleteConnectedAccount } from '@/lib/composio';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const result = await getConnectedAccounts(payload.userId as string);
    const connections = Array.isArray(result) ? result : (result?.items || result);
    return NextResponse.json({ connections });
  } catch (error: any) {
    console.error('Connections error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list connections' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { connectedAccountId } = await req.json();
    if (!connectedAccountId) return NextResponse.json({ error: 'connectedAccountId required' }, { status: 400 });

    await deleteConnectedAccount(connectedAccountId);
    return NextResponse.json({ message: 'Disconnected' });
  } catch (error: any) {
    console.error('Disconnect error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}