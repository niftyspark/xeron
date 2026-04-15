export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    const { image, prompt } = await req.json();
    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = process.env.CLOUDFLARE_AI_TOKEN;

    if (!cfAccountId || !cfApiToken) {
      return NextResponse.json(
        { error: 'Image analysis not configured' },
        { status: 500 }
      );
    }

    // Use Llama 3.2 11B Vision model on Cloudflare Workers AI
    const model = '@cf/meta/llama-3.2-11b-vision-instruct';
    const userPrompt = prompt || 'Describe this image in detail. What do you see?';

    // Extract base64 data from data URL
    let base64Data = image;
    if (image.startsWith('data:')) {
      base64Data = image.split(',')[1];
    }

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Data}` } },
              ],
            },
          ],
          max_tokens: 1024,
        }),
      }
    );

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error('CF Vision error:', cfRes.status, errText);
      return NextResponse.json(
        { error: `Analysis failed: ${cfRes.status}` },
        { status: cfRes.status }
      );
    }

    const data = await cfRes.json();
    const analysis = data?.result?.response || data?.result?.content || 'Could not analyze image.';

    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error('Image analysis error:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Image analysis failed' },
      { status: 500 }
    );
  }
}