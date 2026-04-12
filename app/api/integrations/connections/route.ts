import { NextRequest, NextResponse } from 'next/server';
import { getConnectedAccounts, deleteConnectedAccount } from '@/lib/composio';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/integrations/connections
 * List all connected accounts for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId as string;
    const accounts = await getConnectedAccounts(userId);

    return NextResponse.json({ connections: accounts });
  } catch (error: any) {
    console.error('List connections error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list connections' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/connections
 * Disconnect a connected account
 * Body: { connectedAccountId: "..." }
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { connectedAccountId } = await req.json();
    if (!connectedAccountId) {
      return NextResponse.json({ error: 'connectedAccountId required' }, { status: 400 });
    }

    await deleteConnectedAccount(connectedAccountId);

    return NextResponse.json({ message: 'Disconnected' });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}