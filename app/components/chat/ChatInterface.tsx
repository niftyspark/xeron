'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat, ChatMessage } from '@/app/store/useChat';
import { useUser } from '@/app/store/useUser';
import { useStreaming } from '@/app/hooks/useStreaming';
import { useUI } from '@/app/store/useUI';
import { MessageBubble } from './MessageBubble';
import { ChatInput, type Attachment } from './ChatInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

export function ChatInterface() {
  const {
    conversations,
    activeConversationId,
    addMessage,
    addConversation,
    currentModel,
    createConversation,
    saveMessage,
    loadConversations,
    loadMessages,
    conversationsLoaded,
    updateConversationMessages,
    updateMessage,
  } = useChat();
  const { isAuthenticated } = useUser();
  const { decrementMessages, checkDailyReset } = useUI();
  const { isStreaming, startStream, stopStream } = useStreaming();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedConvRef = useRef<Set<string>>(new Set());

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConv?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    checkDailyReset();
  }, [checkDailyReset]);

  // Load conversation list from server on mount.
  useEffect(() => {
    if (isAuthenticated && !conversationsLoaded) {
      loadConversations().catch(() => {
        /* stay usable offline */
      });
    }
  }, [isAuthenticated, conversationsLoaded, loadConversations]);

  // Load messages when switching conversation — messages are never persisted
  // client-side (per audit #65), so they must be fetched from /api/messages.
  useEffect(() => {
    if (
      activeConversationId &&
      !loadedConvRef.current.has(activeConversationId)
    ) {
      loadedConvRef.current.add(activeConversationId);
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  const handleSend = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (
        (!content.trim() && (!attachments || attachments.length === 0)) ||
        isStreaming
      )
        return;

      const imageAttachments = attachments?.filter((a) => a.type === 'image') ?? [];
      const textAttachments = attachments?.filter((a) => a.type === 'text') ?? [];
      const hasImages = imageAttachments.length > 0;

      let convId = activeConversationId;

      if (!convId) {
        const title =
          content.slice(0, 50) || (hasImages ? 'Image analysis' : 'New chat');
        const newConv = await createConversation(title, currentModel);
        if (newConv) {
          convId = newConv.id;
          loadedConvRef.current.add(convId);
        } else {
          // Offline fallback — server reachable but DB insert failed.
          convId = crypto.randomUUID();
          addConversation({
            id: convId,
            title,
            model: currentModel,
            messages: [],
            isPinned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          loadedConvRef.current.add(convId);
        }
      }

      // Build user content + metadata.
      let userContent = content;
      if (textAttachments.length > 0) {
        userContent +=
          '\n\n' +
          textAttachments
            .map((a) => `[File: ${a.name}]\n${a.content}`)
            .join('\n\n');
      }
      if (hasImages) {
        userContent =
          (userContent || 'Analyze this image') +
          `\n\nAttached: ${imageAttachments.length} image(s)`;
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userContent,
        createdAt: new Date(),
        ...(hasImages && {
          metadata: { images: imageAttachments.map((a) => a.content) },
        }),
      };
      addMessage(convId, userMsg);
      saveMessage(convId, 'user', userContent);

      if (hasImages) {
        // IMAGE ANALYSIS FLOW — analyse in parallel (audit #45).
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Analysing image...',
          createdAt: new Date(),
          isStreaming: true,
        };
        addMessage(convId, assistantMsg);

        try {
          const analyses = await Promise.all(
            imageAttachments.map(async (img) => {
              const res = await authFetch('/api/ai/analyze-image', {
                method: 'POST',
                json: {
                  image: img.content,
                  prompt: content || 'Describe this image in detail.',
                },
              });
              if (res.ok) {
                const data = (await res.json()) as { analysis: string };
                return data.analysis;
              }
              const err = (await res.json().catch(() => ({}))) as {
                error?: string;
              };
              return `Failed to analyze: ${err.error || `status ${res.status}`}`;
            }),
          );

          const result = analyses.join('\n\n---\n\n');
          updateMessage(convId, assistantMsg.id, result);
          saveMessage(convId, 'assistant', result);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : 'Image analysis failed.';
          updateMessage(convId, assistantMsg.id, `Image analysis failed: ${msg}`);
          toast.error('Image analysis failed');
        }
      } else {
        // CHAT FLOW — stream the assistant response.
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          isStreaming: true,
        };

        // Build the message history locally INSTEAD OF re-reading the store
        // after addMessage (audit #44 race).
        const existingMessages = (
          useChat.getState().conversations.find((c) => c.id === convId)
            ?.messages ?? []
        ).map((m) => ({ role: m.role, content: m.content }));
        const wireMessages = [
          ...existingMessages,
          { role: userMsg.role, content: userMsg.content },
        ].filter((m) => m.content);

        addMessage(convId, assistantMsg);

        await startStream(convId, assistantMsg.id, wireMessages, currentModel);

        const updatedConv = useChat
          .getState()
          .conversations.find((c) => c.id === convId);
        const finalMsg = updatedConv?.messages.find((m) => m.id === assistantMsg.id);
        if (finalMsg?.content) saveMessage(convId, 'assistant', finalMsg.content);
      }

      // Decrement local counter after a successful round-trip (audit #79).
      decrementMessages();

      // Fire-and-forget memory extraction.
      const latestConv = useChat
        .getState()
        .conversations.find((c) => c.id === convId);
      const recentMessages = (latestConv?.messages ?? [])
        .filter((m) => m.content)
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));
      if (recentMessages.length > 0) {
        authFetch('/api/ai/extract-memories', {
          method: 'POST',
          json: { conversationId: convId, messages: recentMessages },
        }).catch(() => {
          /* best-effort */
        });
      }
    },
    [
      activeConversationId,
      addConversation,
      addMessage,
      createConversation,
      currentModel,
      decrementMessages,
      isStreaming,
      saveMessage,
      startStream,
      updateMessage,
    ],
  );

  const [generatingImage, setGeneratingImage] = useState(false);

  const handleImageGenerate = useCallback(
    async (prompt: string) => {
      if (generatingImage) return;

      let convId = activeConversationId;
      if (!convId) {
        const title = `Image: ${prompt.slice(0, 40)}...`;
        const newConv = await createConversation(title, currentModel);
        if (newConv) {
          convId = newConv.id;
          loadedConvRef.current.add(convId);
        } else {
          convId = crypto.randomUUID();
          addConversation({
            id: convId,
            title,
            model: currentModel,
            messages: [],
            isPinned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          loadedConvRef.current.add(convId);
        }
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `Generate image: ${prompt}`,
        createdAt: new Date(),
      };
      addMessage(convId, userMsg);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Generating image...',
        createdAt: new Date(),
        isStreaming: true,
      };
      addMessage(convId, assistantMsg);

      setGeneratingImage(true);
      try {
        const res = await authFetch('/api/ai/image', {
          method: 'POST',
          json: { prompt, model: 'flux-schnell' },
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? 'Image generation failed');
        }

        const data = (await res.json()) as { image: string; model: string };

        const conv = useChat.getState().conversations.find((c) => c.id === convId);
        if (conv) {
          const updated = conv.messages.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: `"${prompt}"\nGenerated with ${data.model}`,
                  isStreaming: false,
                  metadata: { images: [data.image] },
                }
              : m,
          );
          updateConversationMessages(convId, updated);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Image generation failed';
        updateMessage(convId, assistantMsg.id, `Failed to generate image: ${msg}`);
        toast.error(msg);
      } finally {
        setGeneratingImage(false);
      }
    },
    [
      activeConversationId,
      addConversation,
      addMessage,
      createConversation,
      currentModel,
      generatingImage,
      updateConversationMessages,
      updateMessage,
    ],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">XERON</h2>
              <p className="text-white/40 max-w-md">
                Your autonomous AI agent. Ask anything, execute tasks, or let me
                learn about your preferences.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              {[
                'Build a REST API with authentication and rate limiting',
                'Analyze this dataset and create visualizations',
                'Create a full-stack Next.js dashboard with authentication',
                'Explain the latest trends in AI and machine learning',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="p-3 text-left text-sm text-white/50 hover:text-white rounded-xl glass hover:bg-white/[0.06] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-1">
            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>

            {isStreaming &&
              messages[messages.length - 1]?.isStreaming &&
              messages[messages.length - 1]?.content === '' && (
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
                  </div>
                  <span className="text-xs text-white/30">XERON is thinking...</span>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput
        onSend={handleSend}
        onImageGenerate={handleImageGenerate}
        isStreaming={isStreaming || generatingImage}
        onStop={stopStream}
      />
    </div>
  );
}
