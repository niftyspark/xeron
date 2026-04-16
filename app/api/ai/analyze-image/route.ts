export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';

const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

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
      return NextResponse.json({ error: 'Image analysis not configured' }, { status: 500 });
    }

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${MODEL}`;
    const cfHeaders = {
      'Authorization': `Bearer ${cfApiToken}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Agree to Meta license (idempotent — safe to call every time)
    await fetch(cfUrl, {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify({ prompt: 'agree' }),
    }).catch(() => {});

    // Step 2: Analyze the image
    const userPrompt = prompt || 'Describe this image in detail. What do you see? Be specific about objects, colors, text, and context.';

    // Ensure image is a proper data URI
    let imageDataUri = image;
    if (!image.startsWith('data:')) {
      // Raw base64 — wrap it
      imageDataUri = `data:image/png;base64,${image}`;
    }

    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageDataUri } },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error('CF Vision error:', cfRes.status, errText);

      // Fallback: use the main chat AI to describe what the user asked
      // (won't see the image but at least won't error out)
      return NextResponse.json({
        analysis: `I received your image but the vision model returned an error (${cfRes.status}). Please try again or describe the image to me in text.`,
      });
    }

    const data = await cfRes.json();
    const analysis = data?.result?.response || data?.response || 'Could not analyze the image. Please try again.';

    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error('Image analysis error:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Image analysis failed' },
      { status: 500 }
    );
  }
}