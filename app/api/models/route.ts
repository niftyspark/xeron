import { NextRequest, NextResponse } from 'next/server';
import { ALL_MODELS } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase();

  let filtered = ALL_MODELS;

  if (provider && provider !== 'all') {
    filtered = filtered.filter((m) => m.provider === provider);
  }
  if (category && category !== 'all') {
    filtered = filtered.filter((m) => m.category === category);
  }
  if (search) {
    filtered = filtered.filter(
      (m) =>
        m.displayName.toLowerCase().includes(search) ||
        m.modelId.toLowerCase().includes(search) ||
        m.provider.toLowerCase().includes(search) ||
        m.tags.some((t) => t.toLowerCase().includes(search))
    );
  }

  return NextResponse.json({
    models: filtered,
    total: ALL_MODELS.length,
    filtered: filtered.length,
  });
}
