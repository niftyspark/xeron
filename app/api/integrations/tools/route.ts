export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listTools } from '@/lib/composio';

export async function GET(req: NextRequest) {
  try {
    const toolkit = req.nextUrl.searchParams.get('toolkit') || undefined;

    const result = await listTools(toolkit);
    const tools = Array.isArray(result) ? result : (result?.items || result);
    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error('Tools error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list tools' },
      { status: 500 }
    );
  }
}