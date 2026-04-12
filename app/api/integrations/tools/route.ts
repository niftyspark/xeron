import { NextRequest, NextResponse } from 'next/server';
import { listTools, searchTools } from '@/lib/composio';

/**
 * GET /api/integrations/tools
 * List tools for a toolkit, or search tools
 * Query params: ?toolkit=github or ?search=create issue
 */
export async function GET(req: NextRequest) {
  try {
    const toolkit = req.nextUrl.searchParams.get('toolkit') || undefined;
    const search = req.nextUrl.searchParams.get('search');

    if (search) {
      const results = await searchTools(search);
      return NextResponse.json({ tools: results });
    }

    const tools = await listTools(toolkit);
    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error('List tools error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list tools' },
      { status: 500 }
    );
  }
}