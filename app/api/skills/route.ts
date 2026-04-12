import { NextRequest, NextResponse } from 'next/server';
import { BUILTIN_SKILLS } from '@/lib/skills';

export async function GET(req: NextRequest) {
  return NextResponse.json(BUILTIN_SKILLS);
}
