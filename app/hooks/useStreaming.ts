'use client';

import { useCallback, useRef, useState } from 'react';
import { useChat } from '@/app/store/useChat';

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
      skills?: string[]
    ) => {
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      setStreaming(true);

      try {
        // Get auth token for memory loading
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        try {
          const stored = localStorage.getItem('xeron-user');
          if (stored) {
            const parsed = JSON.parse(stored);
            const token = parsed?.state?.token;
            if (token) headers['Authorization'] = `Bearer ${token}`;
          }
        } catch {}

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ messages, model, skills: skills || [] }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.text();
          updateMessage(conversationId, messageId, `Error: ${error}`);
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          updateMessage(conversationId, messageId, 'Error: No response stream');
          return;
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  appendToMessage(conversationId, messageId, content);
                }
              } catch {
                // skip malformed
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          updateMessage(
            conversationId,
            messageId,
            'An error occurred while streaming the response.'
          );
        }
      } finally {
        setIsStreaming(false);
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [appendToMessage, updateMessage, setStreaming]
  );

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreaming(false);
  }, [setStreaming]);

  return { isStreaming, startStream, stopStream };
}
