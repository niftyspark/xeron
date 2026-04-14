export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Cloudflare Workers AI image models
const MODELS: Record<string, string> = {
  'flux-schnell': '@cf/black-forest-labs/flux-1-schnell',
  'flux-2-dev': '@cf/black-forest-labs/flux-2-dev',
  'sdxl': '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  'sdxl-lightning': '@cf/bytedance/stable-diffusion-xl-lightning',
  'dreamshaper': '@cf/lykon/dreamshaper-8-lcm',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model = 'flux-schnell', negativePrompt, width, height, steps } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = process.env.CLOUDFLARE_AI_TOKEN;

    if (!cfAccountId || !cfApiToken) {
      return NextResponse.json(
        { error: 'Cloudflare AI not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN to env vars.' },
        { status: 500 }
      );
    }

    const modelId = MODELS[model] || MODELS['flux-schnell'];

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${modelId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          ...(negativePrompt && { negative_prompt: negativePrompt }),
          ...(width && { width }),
          ...(height && { height }),
          ...(steps && { num_steps: steps }),
        }),
      }
    );

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error('Cloudflare AI error:', cfRes.status, errText);
      return NextResponse.json(
        { error: `Image generation failed: ${cfRes.status}` },
        { status: cfRes.status }
      );
    }

    // Cloudflare returns raw image bytes
    const imageBuffer = await cfRes.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({
      image: dataUrl,
      model: modelId,
      prompt,
    });
  } catch (err: any) {
    console.error('Image generation error:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Image generation failed' },
      { status: 500 }
    );
  }
}