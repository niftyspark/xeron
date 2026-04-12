import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/composio';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/integrations/execute
 * Execute a tool action
 * Body: { tool: "GITHUB_CREATE_ISSUE", params: { ... } }
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

    const { tool, params } = await req.json();
    if (!tool) {
      return NextResponse.json({ error: 'tool slug is required' }, { status: 400 });
    }

    const userId = payload.userId as string;
    const result = await executeTool(tool, userId, params || {});

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Execute tool error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute tool' },
      { status: 500 }
    );
  }
}