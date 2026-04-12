import { NextRequest, NextResponse } from 'next/server';
import { initiateConnection } from '@/lib/composio';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/integrations/connect
 * Initiate OAuth connection for a user to a toolkit
 * Body: { toolkit: "github" }
 */
export async function POST(req: NextRequest) {
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

    const { toolkit, redirectUrl } = await req.json();
    if (!toolkit) {
      return NextResponse.json({ error: 'toolkit is required' }, { status: 400 });
    }

    const userId = payload.userId as string;
    const connectionRequest = await initiateConnection(userId, toolkit, redirectUrl);

    return NextResponse.json({
      connectionRequest,
      message: `Connection initiated for ${toolkit}`,
    });
  } catch (error: any) {
    console.error('Connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}