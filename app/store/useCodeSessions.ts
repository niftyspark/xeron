'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CodeChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'plan' | 'agent';
  files?: Record<string, string>;
  isStreaming?: boolean;
}

export interface CodeSession {
  id: string;
  title: string;
  framework: string;
  files: Record<string, string>;
  messages: CodeChatMsg[];
  createdAt: string;
  updatedAt: string;
}

interface CodeSessionsState {
  sessions: CodeSession[];
  activeSessionId: string | null;

  createSession: (framework: string, files: Record<string, string>) => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  updateSession: (id: string, updates: Partial<Pick<CodeSession, 'title' | 'framework' | 'files' | 'messages'>>) => void;
  getActiveSession: () => CodeSession | undefined;
}

export const useCodeSessions = create<CodeSessionsState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (framework, files) => {
        const id = crypto.randomUUID();
        const session: CodeSession = {
          id,
          title: 'New Project',
          framework,
          files,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(s => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      deleteSession: (id) => {
        set(s => ({
          sessions: s.sessions.filter(sess => sess.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        }));
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      updateSession: (id, updates) => {
        set(s => ({
          sessions: s.sessions.map(sess =>
            sess.id === id
              ? { ...sess, ...updates, updatedAt: new Date().toISOString() }
              : sess
          ),
        }));
      },

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find(s => s.id === activeSessionId);
      },
    }),
    {
      name: 'xeron-code-sessions',
      partialize: (state) => ({
        sessions: state.sessions.map(s => ({
          ...s,
          // Strip isStreaming from persisted messages
          messages: s.messages.map(m => ({ ...m, isStreaming: false })),
        })),
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);