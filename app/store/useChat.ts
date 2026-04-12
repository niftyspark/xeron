'use client';

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: Date;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  currentModel: string;

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  appendToMessage: (conversationId: string, messageId: string, chunk: string) => void;
  setStreaming: (streaming: boolean) => void;
  setCurrentModel: (model: string) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  getActiveConversation: () => Conversation | undefined;
}

export const useChat = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  currentModel: 'anthropic/claude-opus-4.6',

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((s) => ({
      conversations: [conversation, ...s.conversations],
      activeConversationId: conversation.id,
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], updatedAt: new Date() }
          : c
      ),
    })),

  updateMessage: (conversationId, messageId, content) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, content, isStreaming: false } : m
              ),
            }
          : c
      ),
    })),

  appendToMessage: (conversationId, messageId, chunk) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, content: m.content + chunk } : m
              ),
            }
          : c
      ),
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setCurrentModel: (model) => set({ currentModel: model }),

  deleteConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId:
        s.activeConversationId === id ? null : s.activeConversationId,
    })),

  updateConversationTitle: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    })),

  getActiveConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.activeConversationId);
  },
}));
