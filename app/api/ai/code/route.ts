export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { badRequest, serviceUnavailable } from '@/lib/errors';
import { CodeAgentSchema } from '@/lib/validators';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

type Action = 'generate' | 'edit' | 'fix' | 'explain';

const FRAMEWORK_INSTRUCTIONS: Record<string, string> = {
  html: `For HTML framework:
- Create: index.html, style.css, script.js
- Use plain HTML5, CSS3, and vanilla JavaScript
- No imports, no build tools, everything runs directly in browser`,
  react: `For React framework:
- Create: App.jsx and style.css
- React 18 and ReactDOM are loaded as globals via CDN (UMD build)
- Babel standalone compiles JSX in-browser
- DO NOT use import/export statements — they won't work
- Use React.useState, React.useEffect etc (React is global)
- Define components as plain functions: function App() { ... }`,
  vue: `For Vue framework:
- Create: App.vue and style.css
- Vue 3 is loaded as global via CDN (UMD build)
- Use Vue 3 Options API inside a Single File Component format`,
  svelte: `For Svelte framework:
- Create: index.html, style.css, script.js
- Since we can't compile Svelte in-browser, write as plain HTML+JS`,
  vanilla: `For Vanilla JS framework:
- Create: index.html, style.css, script.js
- Use plain JavaScript with Canvas API if visual/animation`,
};

function buildSystemPrompt(action: Action, framework: string): string {
  const fwInstructions = FRAMEWORK_INSTRUCTIONS[framework] ?? FRAMEWORK_INSTRUCTIONS.html;
  const base = `You are XERON Code Agent. Write clean, production-quality code.

## OUTPUT FORMAT
Every file MUST be in a fenced code block with the FILENAME as the info string.
Info string = FILENAME with extension (index.html, style.css, App.jsx, script.js).
NEVER use language names (html, css, javascript, jsx) as the info string.
Code blocks FIRST, then a 1-2 sentence summary AFTER.
Each file COMPLETE — no placeholders, no "rest of code" comments.

## Framework: ${framework}
${fwInstructions}
`;

  switch (action) {
    case 'generate':
      return `${base}\n## Task: Generate\nCreate a complete working project for the ${framework} framework.`;
    case 'edit':
      return `${base}\n## Task: Edit\nModify the provided files based on the request. Return COMPLETE file contents.`;
    case 'fix':
      return `${base}\n## Task: Fix Bugs\nFix all issues. Return COMPLETE fixed files.`;
    case 'explain':
      return `${base}\n## Task: Explain\nExplain the code. Do NOT return code blocks unless suggesting improvements.`;
    default:
      return base;
  }
}

function buildUserMessage(
  prompt: string,
  files: Record<string, string>,
  action: Action,
): string {
  const entries = Object.entries(files);
  if (action === 'generate' && entries.length === 0) return prompt;

  let msg = '';
  if (entries.length > 0) {
    msg += '## Current Files:\n\n';
    for (const [name, content] of entries) {
      msg += `\`\`\`${name}\n${content}\n\`\`\`\n\n`;
    }
  }
  msg += `## Request:\n${prompt}`;
  return msg;
}

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = CodeAgentSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid code-agent payload.');

  const {
    prompt,
    files = {},
    framework = 'html',
    action = 'generate',
  } = parsed.data;

  const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
  if (!apiKey) throw serviceUnavailable('AI is not configured.');

  const messages = [
    { role: 'system', content: buildSystemPrompt(action, framework) },
    { role: 'user', content: buildUserMessage(prompt, files, action) },
  ];

  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-opus-4.6',
      messages,
      temperature: 0.3,
      top_p: 1,
      stream: true,
    }),
    signal: req.signal,
  });

  if (!upstream.ok) {
    const text = (await upstream.text()).slice(0, 500);
    console.error('[code] upstream error', upstream.status, text);
    return NextResponse.json({ error: 'AI provider error.' }, { status: upstream.status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }
      const onAbort = () => reader.cancel().catch(() => {});
      req.signal.addEventListener('abort', onAbort);
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      } finally {
        req.signal.removeEventListener('abort', onAbort);
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});
