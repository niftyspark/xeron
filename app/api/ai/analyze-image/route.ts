export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { badRequest, serviceUnavailable, HttpError } from '@/lib/errors';
import { AnalyzeImageSchema } from '@/lib/validators';

const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = AnalyzeImageSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid image payload.');
  const { image, prompt } = parsed.data;

  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_AI_TOKEN;
  if (!cfAccountId || !cfApiToken) throw serviceUnavailable('Image analysis not configured.');

  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${MODEL}`;
  const cfHeaders = {
    Authorization: `Bearer ${cfApiToken}`,
    'Content-Type': 'application/json',
  };

  // License agreement step. Failure is logged but non-fatal — Cloudflare returns
  // success on already-agreed accounts. Only the analyse step determines the
  // response.
  try {
    await fetch(cfUrl, {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify({ prompt: 'agree' }),
      signal: req.signal,
    });
  } catch (err) {
    console.warn('[analyze-image] license-agree step failed', err);
  }

  const userPrompt =
    prompt ||
    'Describe this image in detail. What do you see? Be specific about objects, colors, text, and context.';

  const imageDataUri = image.startsWith('data:')
    ? image
    : `data:image/png;base64,${image}`;

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
    signal: req.signal,
  });

  if (!cfRes.ok) {
    const errText = (await cfRes.text()).slice(0, 500);
    console.error('[analyze-image] CF vision error', cfRes.status, errText);
    throw new HttpError(502, 'Image analysis failed — please retry.');
  }

  const data = (await cfRes.json()) as {
    result?: { response?: string };
    response?: string;
  };
  const analysis = data.result?.response ?? data.response ?? null;
  if (!analysis) throw new HttpError(502, 'Empty analysis from provider.');

  return NextResponse.json({ analysis });
});
