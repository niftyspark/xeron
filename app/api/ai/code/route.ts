export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

type Action = 'generate' | 'edit' | 'fix' | 'explain';

function buildSystemPrompt(action: Action, framework: string): string {
  const base = `You are XERON Code Agent, an expert full-stack developer AI. You write clean, modern, production-quality code.

## Output Format
When providing code, wrap EACH file in a fenced code block with the filename as the language identifier:

\`\`\`filename.ext
...code here...
\`\`\`

For example:
\`\`\`index.html
<!DOCTYPE html>
<html>...</html>
\`\`\`

\`\`\`style.css
body { margin: 0; }
\`\`\`

IMPORTANT: Always use the FILENAME (e.g. \`index.html\`, \`App.jsx\`, \`style.css\`) as the code block identifier, NOT the language name. This is how the system parses your output into files.

## Current Framework: ${framework}

`;

  switch (action) {
    case 'generate':
      return (
        base +
        `## Task: Generate a Complete Project
- Create a complete, working project based on the user's description.
- Include ALL necessary files (HTML, CSS, JS, etc.) for the "${framework}" framework.
- Make the code visually appealing with modern styling.
- Ensure the code runs correctly in a browser sandbox.
- Add brief comments explaining key sections.
- After the code blocks, provide a short explanation of what you built.`
      );

    case 'edit':
      return (
        base +
        `## Task: Edit Existing Code
- The user will provide their current files and a description of changes they want.
- Modify ONLY the files that need changes.
- Return the COMPLETE updated file contents (not partial diffs).
- Maintain the existing code style and structure.
- After the code blocks, briefly explain what you changed and why.`
      );

    case 'fix':
      return (
        base +
        `## Task: Fix Bugs
- Analyze the provided code for bugs, errors, and issues.
- Fix all identified problems.
- Return the COMPLETE fixed file contents.
- After the code blocks, list each bug you found and how you fixed it.`
      );

    case 'explain':
      return (
        base +
        `## Task: Explain Code
- Provide a clear, detailed explanation of the provided code.
- Explain the overall architecture and how files relate to each other.
- Highlight key patterns, techniques, and design decisions.
- Note any potential issues or improvements.
- Do NOT return code blocks unless you are suggesting improvements.
- Structure your explanation with clear headings and sections.`
      );

    default:
      return base;
  }
}

function buildUserMessage(
  prompt: string,
  files: Record<string, string>,
  action: Action,
): string {
  const fileEntries = Object.entries(files);

  if (action === 'generate' && fileEntries.length === 0) {
    return prompt;
  }

  let message = '';

  if (fileEntries.length > 0) {
    message += '## Current Files:\n\n';
    for (const [filename, content] of fileEntries) {
      message += `\`\`\`${filename}\n${content}\n\`\`\`\n\n`;
    }
  }

  message += `## Request:\n${prompt}`;
  return message;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      files = {},
      framework = 'html',
      action = 'generate',
    }: {
      prompt: string;
      files: Record<string, string>;
      framework: string;
      action: Action;
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'A prompt is required' },
        { status: 400 },
      );
    }

    const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured on the server' },
        { status: 500 },
      );
    }

    const systemPrompt = buildSystemPrompt(action, framework);
    const userMessage = buildUserMessage(prompt, files, action);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4.6',
        messages,
        temperature: 0.4,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        repetition_penalty: 1,
        top_k: 0,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `AI API error: ${response.status} - ${errorText}` },
        { status: response.status },
      );
    }

    // Stream the response through (same SSE pattern as chat route)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

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
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Code Agent API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
