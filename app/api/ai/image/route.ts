export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { InferenceClient } from '@huggingface/inference';

const MODELS = {
  'flux': 'black-forest-labs/FLUX.1-schnell',
  'flux-dev': 'black-forest-labs/FLUX.1-dev',
  'sdxl': 'stabilityai/stable-diffusion-xl-base-1.0',
  'sd3': 'stabilityai/stable-diffusion-3-medium-diffusers',
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model = 'flux', negativePrompt, width, height } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Use HF_TOKEN env var (user's HuggingFace token)
    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return NextResponse.json(
        { error: 'HF_TOKEN env var is not set. Add your HuggingFace access token to Vercel.' },
        { status: 500 }
      );
    }

    const client = new InferenceClient(hfToken);
    const modelId = MODELS[model as keyof typeof MODELS] || MODELS.flux;

    const imageBlob = await client.textToImage({
      model: modelId,
      inputs: prompt,
      parameters: {
        ...(negativePrompt && { negative_prompt: negativePrompt }),
        ...(width && { width }),
        ...(height && { height }),
      },
    });

    // Convert blob to base64
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageBlob.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;

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