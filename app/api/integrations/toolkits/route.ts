export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listToolkits, getToolkit } from '@/lib/composio';

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug');

    if (slug) {
      const toolkit = await getToolkit(slug);
      return NextResponse.json({ toolkit });
    }

    const result = await listToolkits();
    // result might be { items: [...] } or an array
    const toolkits = Array.isArray(result) ? result : (result?.items || result);
    return NextResponse.json({ toolkits });
  } catch (error: any) {
    console.error('Toolkits error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list toolkits' },
      { status: 500 }
    );
  }
}