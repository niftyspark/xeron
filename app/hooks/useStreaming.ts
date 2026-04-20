'use client';

import { useCallback, useRef, useState } from 'react';
import { useChat } from '@/app/store/useChat';
import { authFetch } from '@/lib/client-auth';

/**
 * Hook that wraps the streaming chat fetch.
 *
 * Correctness fixes:
 *  - Client auth via httpOnly cookie — no localStorage token reads.
 *  - Reader is released on all paths (success, error, abort).
 *  - Abort flows through to upstream via the fetch signal.
 */
export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { appendToMessage, updateMessage, setStreaming } = useChat();

  const startStream = useCallback(
    async (
      conversationId: string,
      messageId: string,
      messages: { role: string; content: string }[],
      model: string,
      skills?: string[],
    ) => {
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      setStreaming(true);

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      try {
        const response = await authFetch('/api/ai/chat', {
          method: 'POST',
          json: { messages, model, skills: skills ?? [] },
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          updateMessage(conversationId, messageId, `Error: ${errText || response.statusText}`);
          return;
        }

        reader = response.body?.getReader() ?? null;
        if (!reader) {
          updateMessage(conversationId, messageId, 'Error: No response stream');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) appendToMessage(conversationId, messageId, content);
            } catch {
              /* skip malformed chunk */
            }
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          updateMessage(
            conversationId,
            messageId,
            'An error occurred while streaming the response.',
          );
        }
      } finally {
        if (reader) {
          try {
            reader.releaseLock();
          } catch {
            /* already released */
          }
        }
        setIsStreaming(false);
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [appendToMessage, updateMessage, setStreaming],
  );

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreaming(false);
  }, [setStreaming]);

  return { isStreaming, startStream, stopStream };
}
