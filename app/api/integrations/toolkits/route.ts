import { NextRequest, NextResponse } from 'next/server';
import { listToolkits, getToolkit } from '@/lib/composio';

/**
 * GET /api/integrations/toolkits
 * List all available toolkits or get one by slug
 * Query params: ?slug=github or ?category=developer-tools
 */
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug');
    const category = req.nextUrl.searchParams.get('category') || undefined;

    if (slug) {
      const toolkit = await getToolkit(slug);
      return NextResponse.json({ toolkit });
    }

    const toolkits = await listToolkits(category);
    return NextResponse.json({ toolkits });
  } catch (error: any) {
    console.error('List toolkits error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list toolkits' },
      { status: 500 }
    );
  }
}