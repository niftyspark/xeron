'use client';

/**
 * Chat store.
 *
 * Audit #65 addressed: conversations are persisted without their `messages`
 * array. Every streamed chunk used to trigger a JSON.stringify of the entire
 * conversation tree into localStorage — O(N^2) in message count and
 * megabytes of main-thread work on long sessions.
 *
 * Persistence strategy (version 3):
 *   - Persist: `ConversationMeta[]` (id, title, model, isPinned, timestamps),
 *     activeConversationId, currentModel.
 *   - NOT persisted: `messages` (fetched from /api/messages on demand),
 *     isStreaming flags, volatile UI state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authFetch } from '@/lib/client-auth';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: Date;
  isStreaming?: boolean;
  metadata?: { images?: string[]; [key: string]: unknown };
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

/** Persistable slice — NO messages. */
interface ConversationMeta {
  id: string;
  title: string;
  model: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
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
  updateConversationMessages: (id: string, messages: ChatMessage[]) => void;
  getActiveConversation: () => Conversation | undefined;

  createConversation: (title: string, model: string) => Promise<Conversation | null>;
  saveMessage: (conversationId: string, role: string, content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  deleteConversationFromDB: (id: string) => Promise<void>;
}

function toConversation(meta: ConversationMeta): Conversation {
  return {
    id: meta.id,
    title: meta.title,
    model: meta.model,
    isPinned: meta.isPinned,
    createdAt: new Date(meta.createdAt),
    updatedAt: new Date(meta.updatedAt),
    messages: [], // always fetched on demand
  };
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
              : c,
          ),
        })),

      updateMessage: (conversationId, messageId, content) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, content, isStreaming: false } : m,
                  ),
                }
              : c,
          ),
        })),

      appendToMessage: (conversationId, messageId, chunk) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, content: m.content + chunk } : m,
                  ),
                }
              : c,
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
            c.id === id ? { ...c, title } : c,
          ),
        })),

      updateConversationMessages: (id, messages) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, messages } : c,
          ),
        })),

      getActiveConversation: () =>
        get().conversations.find((c) => c.id === get().activeConversationId),

      // ── Server-backed operations ──────────────────────────────────────

      createConversation: async (title, model) => {
        try {
          const res = await authFetch('/api/conversations', {
            method: 'POST',
            json: { title, model },
          });
          if (!res.ok) return null;
          const dbConv = (await res.json()) as {
            id: string;
            title: string;
            model: string;
            isPinned: boolean | null;
            createdAt: string;
            updatedAt: string;
          };

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
        } catch {
          return null;
        }
      },

      saveMessage: async (conversationId, role, content) => {
        try {
          await authFetch('/api/messages', {
            method: 'POST',
            json: { conversationId, role, content },
          });
        } catch {
          /* surfaced via UI if needed; network is best-effort */
        }
      },

      loadConversations: async () => {
        try {
          const res = await authFetch('/api/conversations', { method: 'GET' });
          if (!res.ok) return;
          const db = (await res.json()) as Array<{
            id: string;
            title: string | null;
            model: string | null;
            isPinned: boolean | null;
            createdAt: string;
            updatedAt: string;
          }>;

          const conversations: Conversation[] = db.map((c) => ({
            id: c.id,
            title: c.title || 'Untitled',
            model: c.model || 'anthropic/claude-opus-4.6',
            messages: [], // fetched on demand via loadMessages
            isPinned: c.isPinned ?? false,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          }));

          set({ conversations, conversationsLoaded: true });
        } catch {
          /* ignore — offline keeps whatever metadata was persisted */
        }
      },

      loadMessages: async (conversationId) => {
        try {
          const res = await authFetch(
            `/api/messages?conversationId=${encodeURIComponent(conversationId)}`,
            { method: 'GET' },
          );
          if (!res.ok) return;
          const db = (await res.json()) as Array<{
            id: string;
            role: string;
            content: string;
            createdAt: string;
          }>;
          const messages: ChatMessage[] = db.map((m) => ({
            id: m.id,
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
            createdAt: new Date(m.createdAt),
            isStreaming: false,
          }));
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, messages } : c,
            ),
          }));
        } catch {
          /* ignore */
        }
      },

      deleteConversationFromDB: async (id) => {
        try {
          await authFetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
          set((s) => ({
            conversations: s.conversations.filter((c) => c.id !== id),
            activeConversationId:
              s.activeConversationId === id ? null : s.activeConversationId,
          }));
        } catch {
          /* ignore */
        }
      },
    }),
    {
      name: 'xeron-chat',
      version: 3, // bumped: messages no longer persisted
      migrate: (persisted, _version) => {
        // From any older version, drop the messages arrays entirely.
        if (persisted && typeof persisted === 'object') {
          const state = persisted as { conversations?: unknown[] };
          if (Array.isArray(state.conversations)) {
            state.conversations = state.conversations.map((c) => ({
              ...(c as object),
              messages: [],
            }));
          }
          return state as Partial<ChatState> as ChatState;
        }
        return persisted as ChatState;
      },
      // Persist only lightweight metadata. Messages are server-authoritative
      // and fetched via loadMessages() when a conversation is opened.
      // We intentionally narrow `conversations` to string-date metadata for
      // serialization, then re-inflate in onRehydrateStorage.
      partialize: (state) =>
        ({
          conversations: state.conversations.map<ConversationMeta>((c) => ({
            id: c.id,
            title: c.title,
            model: c.model,
            isPinned: c.isPinned,
            createdAt:
              c.createdAt instanceof Date
                ? c.createdAt.toISOString()
                : String(c.createdAt),
            updatedAt:
              c.updatedAt instanceof Date
                ? c.updatedAt.toISOString()
                : String(c.updatedAt),
          })),
          activeConversationId: state.activeConversationId,
          currentModel: state.currentModel,
        }) as unknown as ChatState,
      // Rehydrate the persisted meta shape back into full Conversation shape.
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        const metas = state.conversations as unknown as ConversationMeta[];
        if (Array.isArray(metas)) {
          state.conversations = metas.map(toConversation);
        }
      },
    },
  ),
);
