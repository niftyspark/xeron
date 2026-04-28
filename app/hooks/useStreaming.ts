'use client';

import { useCallback, useRef, useState } from 'react';
import { useChat } from '@/app/store/useChat';
import { authFetch } from '@/lib/client-auth';

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

        console.log('[streaming] Response status:', response.status);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.log('[streaming] Error response:', errText);
          updateMessage(conversationId, messageId, `Error: ${errText || response.statusText}`);
          return;
        }

        reader = response.body?.getReader() ?? null;
        if (!reader) {
          console.log('[streaming] No reader available');
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
              if (content) {
                console.log('[streaming] Chunk received:', content.slice(0, 50));
                appendToMessage(conversationId, messageId, content);
              }
            } catch {
              console.log('[streaming] Failed to parse chunk:', data.slice(0, 100));
            }
          }
        }
        console.log('[streaming] Stream complete');
      } catch (err) {
        console.log('[streaming] Catch error:', err);
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