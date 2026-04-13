'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppTheme = 'glassmorphism' | 'neumorphism' | 'minimalist' | 'bento' | 'neoskeu';

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  rightPanelOpen: boolean;
  theme: 'dark' | 'light';
  appTheme: AppTheme;
  skillsPanelOpen: boolean;
  integrationsPanelOpen: boolean;
  userTier: string;
  messagesRemaining: number;
  messagesLimit: number;
  lastResetDate: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAppTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
  setSkillsPanelOpen: (open: boolean) => void;
  setIntegrationsPanelOpen: (open: boolean) => void;
  setUserTier: (tier: string) => void;
  setMessagesRemaining: (count: number) => void;
  setMessagesLimit: (limit: number) => void;
  decrementMessages: () => void;
  checkDailyReset: () => void;
}

const themes: AppTheme[] = ['glassmorphism', 'neumorphism', 'minimalist', 'bento', 'neoskeu'];

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      commandPaletteOpen: false,
      rightPanelOpen: false,
      theme: 'dark',
      appTheme: 'glassmorphism',
      skillsPanelOpen: false,
      integrationsPanelOpen: false,
      userTier: 'free',
      messagesRemaining: 50,
      messagesLimit: 50,
      lastResetDate: new Date().toDateString(),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setTheme: (theme) => set({ theme }),
      setAppTheme: (appTheme) => set({ appTheme }),
      cycleTheme: () => {
        const current = get().appTheme;
        const idx = themes.indexOf(current);
        const next = themes[(idx + 1) % themes.length];
        set({ appTheme: next });
      },
      setSkillsPanelOpen: (open) => set({ skillsPanelOpen: open }),
      setIntegrationsPanelOpen: (open) => set({ integrationsPanelOpen: open }),
      setUserTier: (tier) => set({ userTier: tier }),
      setMessagesRemaining: (count) => set({ messagesRemaining: count }),
      setMessagesLimit: (limit) => set({ messagesLimit: limit }),
      decrementMessages: () => set((s) => ({
        messagesRemaining: Math.max(0, s.messagesRemaining - 1),
      })),
      checkDailyReset: () => {
        const today = new Date().toDateString();
        const { lastResetDate, messagesLimit } = get();
        if (lastResetDate !== today) {
          set({ messagesRemaining: messagesLimit, lastResetDate: today });
        }
      },
    }),
    { name: 'xeron-ui' }
  )
);