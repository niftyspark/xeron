export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { badRequest, serviceUnavailable, HttpError } from '@/lib/errors';
import { ImageGenerateSchema } from '@/lib/validators';

const MODELS: Record<string, string> = {
  'flux-schnell': '@cf/black-forest-labs/flux-1-schnell',
  'flux-2-dev': '@cf/black-forest-labs/flux-2-dev',
  sdxl: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  'sdxl-lightning': '@cf/bytedance/stable-diffusion-xl-lightning',
  dreamshaper: '@cf/lykon/dreamshaper-8-lcm',
};

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ImageGenerateSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid image payload.');
  const { prompt, model = 'flux-schnell', negativePrompt, width, height, steps } = parsed.data;

  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_AI_TOKEN;
  if (!cfAccountId || !cfApiToken) throw serviceUnavailable('Image generation not configured.');

  const modelId = MODELS[model] ?? MODELS['flux-schnell'];

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${modelId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        ...(negativePrompt && { negative_prompt: negativePrompt }),
        ...(width && { width }),
        ...(height && { height }),
        ...(steps && { num_steps: steps }),
      }),
      signal: req.signal,
    },
  );

  if (!cfRes.ok) {
    const errText = (await cfRes.text()).slice(0, 500);
    console.error('[image] cloudflare error', cfRes.status, errText);
    throw new HttpError(cfRes.status, 'Image generation failed.');
  }

  const contentType = cfRes.headers.get('content-type') ?? '';
  let dataUrl: string;

  if (contentType.includes('application/json')) {
    const json = (await cfRes.json()) as {
      result?: { image?: string; images?: string[] };
      image?: string;
    };
    const b64 =
      json.result?.image ?? json.image ?? json.result?.images?.[0] ?? null;
    if (!b64) {
      console.error('[image] CF returned JSON but no image field');
      throw new HttpError(502, 'No image in provider response.');
    }
    dataUrl = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
  } else if (contentType.includes('image/')) {
    const buf = await cfRes.arrayBuffer();
    const mime = contentType.split(';')[0].trim();
    dataUrl = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } else {
    const buf = await cfRes.arrayBuffer();
    // Validate PNG/JPEG magic bytes; reject clearly broken payloads.
    const head = new Uint8Array(buf.slice(0, 4));
    const isPng = head[0] === 0x89 && head[1] === 0x50;
    const isJpg = head[0] === 0xff && head[1] === 0xd8;
    if (!isPng && !isJpg) {
      console.error('[image] CF returned unknown format');
      throw new HttpError(502, 'Invalid image format from provider.');
    }
    const mime = isPng ? 'image/png' : 'image/jpeg';
    dataUrl = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  }

  return NextResponse.json({ image: dataUrl, model: modelId, prompt });
});
