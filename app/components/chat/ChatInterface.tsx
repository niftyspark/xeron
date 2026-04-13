'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat, ChatMessage, Conversation } from '@/app/store/useChat';
import { useUser } from '@/app/store/useUser';
import { useStreaming } from '@/app/hooks/useStreaming';
import { useSkills } from '@/app/store/useSkills';
import { useUI } from '@/app/store/useUI';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function ChatInterface() {
  const {
    conversations, activeConversationId, addMessage, addConversation,
    setActiveConversation, currentModel,
    createConversation, saveMessage, loadConversations, loadMessages,
    conversationsLoaded,
  } = useChat();
  const { token, isAuthenticated } = useUser();
  const { enabledSkills } = useSkills();
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

  const handleSend = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let convId = activeConversationId;

    // Create new conversation if none active
    if (!convId) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      // Try DB first, fall back to local-only
      const newConv = await createConversation(title, currentModel);
      if (newConv) {
        convId = newConv.id;
        loadedConvRef.current.add(convId);
      } else {
        // Fallback: create local-only conversation
        convId = crypto.randomUUID();
        const localConv: Conversation = {
          id: convId,
          title,
          model: currentModel,
          messages: [],
          isPinned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addConversation(localConv);
        loadedConvRef.current.add(convId);
      }
    }

    // Decrement daily message counter
    decrementMessages();

    // Add user message locally
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    };
    addMessage(convId, userMsg);

    // Save user message to DB
    saveMessage(convId, 'user', content);

    // Add empty assistant message for streaming
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      isStreaming: true,
    };
    addMessage(convId, assistantMsg);

    // Get all messages for context
    const conv = useChat.getState().conversations.find(c => c.id === convId);
    const allMessages = conv?.messages.map(m => ({
      role: m.role,
      content: m.content,
    })).filter(m => m.content) || [];

    // Stream response
    await startStream(convId, assistantMsg.id, allMessages, currentModel, enabledSkills);

    // After streaming completes, save the assistant message to DB
    const updatedConv = useChat.getState().conversations.find(c => c.id === convId);
    const finalAssistantMsg = updatedConv?.messages.find(m => m.id === assistantMsg.id);
    if (finalAssistantMsg && finalAssistantMsg.content) {
      saveMessage(convId, 'assistant', finalAssistantMsg.content);
    }

    // Fire-and-forget: extract memories from recent messages
    const latestConv = useChat.getState().conversations.find(c => c.id === convId);
    const recentMessages = (latestConv?.messages || [])
      .filter(m => m.content)
      .slice(-4)
      .map(m => ({ role: m.role, content: m.content }));

    if (recentMessages.length > 0 && token) {
      fetch('/api/ai/extract-memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: convId,
          messages: recentMessages,
        }),
      }).catch(() => {
        // Silent fail - memory extraction is best-effort
      });
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
                'Write a smart contract for an ERC-20 token on Base',
                'Analyze my wallet activity and suggest optimizations',
                'Create a full-stack Next.js dashboard with authentication',
                'Explain the latest trends in DeFi on Layer 2s',
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
      <ChatInput onSend={handleSend} isStreaming={isStreaming} onStop={stopStream} />
    </div>
  );
}
