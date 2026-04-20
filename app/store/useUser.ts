'use client';

/**
 * User identity store.
 *
 * Audit finding addressed (#17): the JWT is no longer stored here or in
 * localStorage. Auth state lives in the httpOnly `xeron_token` cookie which
 * the browser sends automatically on every same-origin request. This store
 * only holds user metadata used for rendering (name, email, avatar).
 *
 * Authentication status is confirmed by a server probe (`/api/user`) rather
 * than by inspecting a client-held token.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userId: string | null;
  walletAddress: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  preferredModel: string;
  isAuthenticated: boolean;

  setUser: (user: {
    userId: string;
    walletAddress: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }) => void;
  setPreferredModel: (model: string) => void;
  clear: () => void;
}

export const useUser = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      walletAddress: null,
      displayName: null,
      avatarUrl: null,
      preferredModel: 'anthropic/claude-opus-4.6',
      isAuthenticated: false,

      setUser: (user) =>
        set({
          userId: user.userId,
          walletAddress: user.walletAddress,
          displayName: user.displayName ?? null,
          avatarUrl: user.avatarUrl ?? null,
          isAuthenticated: true,
        }),

      setPreferredModel: (model) => set({ preferredModel: model }),

      clear: () =>
        set({
          userId: null,
          walletAddress: null,
          displayName: null,
          avatarUrl: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'xeron-user',
      version: 2, // bumped: removed `token` field from v1.
      migrate: (persisted, version) => {
        // Any persisted state from v1 had a `token` field that we must drop.
        if (version < 2 && persisted && typeof persisted === 'object') {
          const next = { ...(persisted as Record<string, unknown>) };
          delete next.token;
          return next as unknown as UserState;
        }
        return persisted as UserState;
      },
      partialize: (state) => ({
        // Intentionally excludes any session token. Only non-sensitive UI
        // metadata is persisted.
        userId: state.userId,
        walletAddress: state.walletAddress,
        displayName: state.displayName,
        avatarUrl: state.avatarUrl,
        preferredModel: state.preferredModel,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
