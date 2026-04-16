'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat, ChatMessage, Conversation } from '@/app/store/useChat';
import { useUser } from '@/app/store/useUser';
import { useStreaming } from '@/app/hooks/useStreaming';

import { useUI } from '@/app/store/useUI';
import { MessageBubble } from './MessageBubble';
import { ChatInput, type Attachment } from './ChatInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function ChatInterface() {
  const {
    conversations, activeConversationId, addMessage, addConversation,
    setActiveConversation, currentModel,
    createConversation, saveMessage, loadConversations, loadMessages,
    conversationsLoaded,
  } = useChat();
  const { token, isAuthenticated } = useUser();
  const { decrementMessages, checkDailyReset } = useUI();
  const { isStreaming, startStream, stopStream } = useStreaming();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedConvRef = useRef<Set<string>>(new Set());

  const activeConv = conversations.find(c => c.id === activeConversationId);
  const messages = activeConv?.messages || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check daily message reset
  useEffect(() => {
    checkDailyReset();
  }, [checkDailyReset]);

  // Load conversations from DB on mount when authenticated
  useEffect(() => {
    if (isAuthenticated && !conversationsLoaded) {
      loadConversations().catch(() => {
        // DB might not be available, that's ok - chat still works locally
      });
    }
  }, [isAuthenticated, conversationsLoaded, loadConversations]);

  // Load messages when switching to a conversation
  useEffect(() => {
    if (activeConversationId && !loadedConvRef.current.has(activeConversationId)) {
      loadedConvRef.current.add(activeConversationId);
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isStreaming) return;

    const imageAttachments = attachments?.filter(a => a.type === 'image') || [];
    const textAttachments = attachments?.filter(a => a.type === 'text') || [];
    const hasImages = imageAttachments.length > 0;

    let convId = activeConversationId;

    // Create new conversation if none active
    if (!convId) {
      const title = content.slice(0, 50) || (hasImages ? 'Image analysis' : 'New chat');
      const newConv = await createConversation(title, currentModel);
      if (newConv) {
        convId = newConv.id;
        loadedConvRef.current.add(convId);
      } else {
        convId = crypto.randomUUID();
        addConversation({
          id: convId, title, model: currentModel, messages: [],
          isPinned: false, createdAt: new Date(), updatedAt: new Date(),
        });
        loadedConvRef.current.add(convId);
      }
    }

    decrementMessages();

    // Build user message content
    let userContent = content;
    if (textAttachments.length > 0) {
      userContent += '\n\n' + textAttachments.map(a => `[File: ${a.name}]\n${a.content}`).join('\n\n');
    }
    if (hasImages) {
      userContent = (userContent || 'Analyze this image') + `\n\n📎 ${imageAttachments.length} image${imageAttachments.length > 1 ? 's' : ''} attached`;
    }

    // Add user message with image previews
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      createdAt: new Date(),
      // Store image data URLs in metadata for rendering
      ...(hasImages && { metadata: { images: imageAttachments.map(a => a.content) } }),
    };
    addMessage(convId, userMsg);
    saveMessage(convId, 'user', userContent);

    if (hasImages) {
      // IMAGE ANALYSIS FLOW — use Cloudflare Vision API
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant',
        content: '🔍 Analyzing image...', createdAt: new Date(), isStreaming: true,
      };
      addMessage(convId, assistantMsg);

      try {
        const { getAuthHeaders } = await import('@/lib/client-auth');
        const analysisPrompt = content || 'Describe this image in detail. What do you see?';

        // Analyze each image
        const analyses: string[] = [];
        for (const img of imageAttachments) {
          const res = await fetch('/api/ai/analyze-image', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ image: img.content, prompt: analysisPrompt }),
          });
          if (res.ok) {
            const data = await res.json();
            analyses.push(data.analysis);
          } else {
            const err = await res.json().catch(() => ({}));
            analyses.push(`Failed to analyze: ${err.error || 'Unknown error'}`);
          }
        }

        const result = analyses.join('\n\n---\n\n');
        useChat.getState().updateMessage(convId, assistantMsg.id, result);
        saveMessage(convId, 'assistant', result);
      } catch (err: any) {
        useChat.getState().updateMessage(convId, assistantMsg.id, `Image analysis failed: ${err.message}`);
        toast.error('Image analysis failed');
      }
    } else {
      // NORMAL CHAT FLOW — stream AI response
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant',
        content: '', createdAt: new Date(), isStreaming: true,
      };
      addMessage(convId, assistantMsg);

      const conv = useChat.getState().conversations.find(c => c.id === convId);
      const allMessages = conv?.messages.map(m => ({
        role: m.role, content: m.content,
      })).filter(m => m.content) || [];

      await startStream(convId, assistantMsg.id, allMessages, currentModel);

      const updatedConv = useChat.getState().conversations.find(c => c.id === convId);
      const finalMsg = updatedConv?.messages.find(m => m.id === assistantMsg.id);
      if (finalMsg?.content) saveMessage(convId, 'assistant', finalMsg.content);
    }

    // Fire-and-forget: extract memories
    const latestConv = useChat.getState().conversations.find(c => c.id === convId);
    const recentMessages = (latestConv?.messages || [])
      .filter(m => m.content).slice(-4)
      .map(m => ({ role: m.role, content: m.content }));
    if (recentMessages.length > 0 && token) {
      fetch('/api/ai/extract-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: convId, messages: recentMessages }),
      }).catch(() => {});
    }
  };

  const [generatingImage, setGeneratingImage] = useState(false);

  const handleImageGenerate = async (prompt: string) => {
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
          id: convId, title, model: currentModel, messages: [],
          isPinned: false, createdAt: new Date(), updatedAt: new Date(),
        });
        loadedConvRef.current.add(convId);
      }
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user',
      content: `🎨 Generate image: ${prompt}`, createdAt: new Date(),
    };
    addMessage(convId, userMsg);

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'assistant',
      content: '🖼️ Generating image...', createdAt: new Date(), isStreaming: true,
    };
    addMessage(convId, assistantMsg);

    setGeneratingImage(true);

    try {
      const { getAuthHeaders } = await import('@/lib/client-auth');
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt, model: 'flux-schnell' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Image generation failed');
      }

      const data = await res.json();

      // Update the assistant message with the image
      useChat.getState().updateMessage(
        convId,
        assistantMsg.id,
        `![Generated Image](${data.image})\n\n*"${prompt}"* — Generated with ${data.model}`
      );
    } catch (err: any) {
      useChat.getState().updateMessage(convId, assistantMsg.id, `Failed to generate image: ${err.message}`);
      toast.error(err.message || 'Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
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
                Your autonomous AI agent. Ask anything, execute tasks, or let me learn about your preferences.
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

            {/* Typing indicator */}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
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

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onImageGenerate={handleImageGenerate}
        isStreaming={isStreaming || generatingImage}
        onStop={stopStream}
      />
    </div>
  );
}
