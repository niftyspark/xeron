const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const HF_API_URL = 'https://api-inference.huggingface.co/models';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const JAN_API_URL = 'http://localhost:1337/v1/chat/completions';

export type AIProvider = 'groq' | 'openai' | 'cloudflare' | 'huggingface' | 'openrouter' | 'jan';

interface Message {
  role: string;
  content: string;
}

interface StreamOptions {
  provider: AIProvider;
  model: string;
  temperature: number;
  messages: Message[];
  signal: AbortSignal;
}

export function getProviderConfig(provider: AIProvider) {
  const configs = {
    groq: {
      url: GROQ_API_URL,
      key: process.env.GROQ_API_KEY || '',
    },
    openai: {
      url: OPENAI_API_URL,
      key: process.env.OPENAI_API_KEY || '',
    },
    huggingface: {
      url: HF_API_URL,
      key: process.env.HUGGINGFACE_API_KEY || '',
    },
    openrouter: {
      url: OPENROUTER_API_URL,
      key: process.env.OPENROUTER_API_KEY || '',
    },
    cloudflare: {
      url: '',
      key: process.env.CLOUDFLARE_AI_TOKEN || '',
    },
    jan: {
      url: process.env.JAN_API_URL || JAN_API_URL,
      key: '',
    },
  };
  return configs[provider];
}

export function getProviderModels(provider: AIProvider): Record<string, string> {
  const models: Record<AIProvider, Record<string, string>> = {
    groq: {
      'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile': 'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant': 'llama-3.1-8b-instant',
    },
    openai: {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4-turbo',
    },
    huggingface: {
      'meta-llama/Llama-3.1-70B-Instruct': 'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct': 'meta-llama/Llama-3.1-8B-Instruct',
    },
    openrouter: {
      'openai/gpt-4o': 'openai/gpt-4o',
      'openai/gpt-4o-mini': 'openai/gpt-4o-mini',
    },
    cloudflare: {
      '@cf/meta/llama-3.1-70b-instruct': '@cf/meta/llama-3.1-70b-instruct',
    },
    jan: {
      'Vikhr-Llama-3.2-1B-Instruct-abliterated.Q4_K_M.gguf': 'Vikhr-Llama-3.2-1B-Instruct-abliterated.Q4_K_M.gguf',
      'llama-3.3-70b-versatile': 'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant': 'llama-3.1-8b-instant',
      'gemeni-2.5-flash': 'gemeni-2.5-flash',
    },
  };
  return models[provider] || {};
}

export function getDefaultModel(provider: AIProvider): string {
  const defaults: Record<AIProvider, string> = {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    cloudflare: '@cf/meta/llama-3.1-70b-instruct',
    huggingface: 'meta-llama/Llama-3.1-8B-Instruct',
    openrouter: 'openai/gpt-4o-mini',
    jan: 'Vikhr-Llama-3.2-1B-Instruct-abliterated.Q4_K_M.gguf',
  };
  return defaults[provider];
}

export function supportsVision(provider: AIProvider): boolean {
  const visionSupport: Record<AIProvider, boolean> = {
    groq: true,
    openai: true,
    cloudflare: true,
    huggingface: false,
    openrouter: true,
    jan: false,
  };
  return visionSupport[provider] || false;
}

export async function streamChatWithTools(opts: StreamOptions): Promise<Response> {
  const { provider, model, temperature, messages, signal } = opts;
  const config = getProviderConfig(provider);

  console.log('[ai] Request:', { provider, model, apiUrl: config.url, messageCount: messages.length });

  if (!config.url) {
    const errorMsg = `Provider ${provider} API URL not configured`;
    console.error('[ai]', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestModel = model || getDefaultModel(provider);

  let url = config.url;
  let body: Record<string, unknown> = {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.key) {
    headers['Authorization'] = `Bearer ${config.key}`;
  }

  // Build body based on provider
  if (provider === 'huggingface') {
    url = `${url}/${requestModel}`;
    body = {
      inputs: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
      parameters: {
        temperature,
        max_new_tokens: 1024,
        return_full_text: false,
      },
    };
  } else if (provider === 'cloudflare') {
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!cfAccountId) {
      return new Response(JSON.stringify({ error: 'Cloudflare account ID not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${requestModel}`;
    body = {
      messages: messages.filter(m => m.role !== 'system'),
      temperature,
    };
  } else {
    // Groq, OpenAI, OpenRouter, Jan.ai - all use OpenAI-compatible format
    body = {
      model: requestModel,
      messages: messages.filter(m => m.role !== 'system'),
      temperature,
      stream: false,
    };
  }

  console.log('[ai] Fetching:', url);
  console.log('[ai] Body:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    const responseText = await response.text();
    console.log('[ai] Response status:', response.status);
    console.log('[ai] Response body:', responseText.slice(0, 500));

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `AI provider error: ${response.status} - ${responseText.slice(0, 200)}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON from AI provider' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let content = '';

    if (provider === 'huggingface') {
      content = data[0]?.generated_text || '';
    } else if (provider === 'cloudflare') {
      content = data.result?.response || '';
    } else {
      // OpenAI-compatible response format
      content = data.choices?.[0]?.message?.content || '';
    }

    console.log('[ai] Extracted content length:', content.length);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunkSize = 64;
        let offset = 0;
        while (offset < content.length) {
          const piece = content.slice(offset, offset + chunkSize);
          offset += chunkSize;
          const payload = { choices: [{ delta: { content: piece } }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[ai] request failed:', error);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function getRelevantMemories(userId: string, _query: string, limit = 5) {
  return [];
}

export async function extractMemories(userId: string, conversationId: string, messages: Message[]) {
  console.log('[extractMemories] skipped in dev mode');
}