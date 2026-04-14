'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// Helper to get auth token from localStorage (can't use hooks inside a store)
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('xeron-user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  currentModel: string;
  conversationsLoaded: boolean;

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

  // DB-backed operations
  createConversation: (title: string, model: string) => Promise<Conversation | null>;
  saveMessage: (conversationId: string, role: string, content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  deleteConversationFromDB: (id: string) => Promise<void>;
}

export const useChat = create<ChatState>()(
  persist(
  (set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  currentModel: 'anthropic/claude-opus-4.6',
  conversationsLoaded: false,

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

  // ── DB-backed operations ─────────────────────────────────────────────

  createConversation: async (title, model) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, model }),
      });
      if (!res.ok) {
        console.error('Failed to create conversation in DB');
        return null;
      }
      const dbConv = await res.json();

      const conversation: Conversation = {
        id: dbConv.id,
        title: dbConv.title || title,
        model: dbConv.model || model,
        messages: [],
        isPinned: dbConv.isPinned ?? false,
        createdAt: new Date(dbConv.createdAt),
        updatedAt: new Date(dbConv.updatedAt),
      };

      set((s) => ({
        conversations: [conversation, ...s.conversations],
        activeConversationId: conversation.id,
      }));

      return conversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      return null;
    }
  },

  saveMessage: async (conversationId, role, content) => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ conversationId, role, content }),
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  },

  loadConversations: async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'GET',
        headers: authHeaders(),
      });
      if (!res.ok) {
        console.error('Failed to load conversations');
        return;
      }
      const dbConversations = await res.json();

      const conversations: Conversation[] = dbConversations.map((c: any) => ({
        id: c.id,
        title: c.title || 'Untitled',
        model: c.model || 'anthropic/claude-opus-4.6',
        messages: [], // messages are loaded lazily per conversation
        isPinned: c.isPinned ?? false,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      }));

      set({ conversations, conversationsLoaded: true });
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`, {
        method: 'GET',
        headers: authHeaders(),
      });
      if (!res.ok) {
        console.error('Failed to load messages');
        return;
      }
      const dbMessages = await res.json();

      const messages: ChatMessage[] = dbMessages.map((m: any) => ({
        id: m.id,
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
        createdAt: new Date(m.createdAt),
        isStreaming: false,
      }));

      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, messages } : c
        ),
      }));
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  },

  deleteConversationFromDB: async (id) => {
    try {
      await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        activeConversationId:
          s.activeConversationId === id ? null : s.activeConversationId,
      }));
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  },
}),
  {
    name: 'xeron-chat',
    partialize: (state) => ({
      conversations: state.conversations,
      activeConversationId: state.activeConversationId,
      currentModel: state.currentModel,
    }),
  }
));
