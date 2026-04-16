export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkConnectionStatus } from '@/lib/composio';
import { requireAuth } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    const connectionId = req.nextUrl.searchParams.get('id');
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connection id' }, { status: 400 });
    }

    const account = await checkConnectionStatus(connectionId);
    return NextResponse.json({ 
      id: account.id,
      status: account.status,
      toolkitSlug: (account as any).toolkitSlug || (account as any).appName,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Status check failed' }, { status: 500 });
  }
}