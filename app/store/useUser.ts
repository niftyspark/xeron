'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userId: string | null;
  walletAddress: string | null;
  displayName: string | null;
  token: string | null;
  preferredModel: string;
  isAuthenticated: boolean;
  setUser: (user: { userId: string; walletAddress: string; displayName?: string; token: string }) => void;
  setPreferredModel: (model: string) => void;
  logout: () => void;
}

export const useUser = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      walletAddress: null,
      displayName: null,
      token: null,
      preferredModel: 'anthropic/claude-opus-4.6',
      isAuthenticated: false,
      setUser: (user) =>
        set({
          userId: user.userId,
          walletAddress: user.walletAddress,
          displayName: user.displayName || null,
          token: user.token,
          isAuthenticated: true,
        }),
      setPreferredModel: (model) => set({ preferredModel: model }),
      logout: () =>
        set({
          userId: null,
          walletAddress: null,
          displayName: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'xeron-user',
      partialize: (state) => ({
        token: state.token,
        preferredModel: state.preferredModel,
        userId: state.userId,
        walletAddress: state.walletAddress,
        displayName: state.displayName,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
