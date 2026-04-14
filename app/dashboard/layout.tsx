'use client';

import { Sidebar } from '@/app/components/dashboard/Sidebar';
import { Header } from '@/app/components/dashboard/Header';
import { CommandPalette } from '@/app/components/dashboard/CommandPalette';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { useEffect, useState, useCallback } from 'react';
import { WalletConnectButton } from '@/app/components/web3/ConnectButton';
import { useWalletAuth } from '@/app/hooks/useWalletAuth';
import { Sparkles, LogOut } from 'lucide-react';
import { TurnstileWidget } from '@/app/components/auth/TurnstileWidget';

function hasValidToken(): boolean {
  // Check localStorage directly — most reliable source
  try {
    const raw = localStorage.getItem('xeron-user');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const t = parsed?.state?.token;
    return typeof t === 'string' && t.includes('.') && t.length > 20;
  } catch {
    return false;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUI();
  const { token, isAuthenticated, logout } = useUser();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  // Auto-authenticate when wallet connects via RainbowKit
  useWalletAuth();

  // Check auth on mount and whenever token changes
  useEffect(() => {
    // Give zustand 100ms to hydrate from localStorage
    const timer = setTimeout(() => {
      if (hasValidToken()) {
        setAuthState('authenticated');
      } else {
        setAuthState('unauthenticated');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Re-check when token changes (after login)
  useEffect(() => {
    if (token && token.includes('.') && token.length > 20) {
      setAuthState('authenticated');
    }
  }, [token]);

  // Also poll localStorage for token changes (catches external writes)
  useEffect(() => {
    if (authState === 'authenticated') return;
    const interval = setInterval(() => {
      if (hasValidToken()) {
        setAuthState('authenticated');
      }
    }, 500);
    return () => clearInterval(interval);
  }, [authState]);

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUI.getState().toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    localStorage.removeItem('xeron-user');
    localStorage.removeItem('xeron-chat');
    localStorage.removeItem('xeron-code-sessions');
    setAuthState('unauthenticated');
  }, [logout]);

  // Loading
  if (authState === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // NOT AUTHENTICATED — BLOCKED. Must sign in.
  if (authState === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/25">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Sign in to XERON</h1>
            <p className="text-white/40 text-sm">
              Connect your wallet or sign in with Google to access your AI agent dashboard.
            </p>
          </div>

          <WalletConnectButton />

          <TurnstileWidget />

          <p className="text-[10px] text-white/15 mt-4">
            By signing in you agree to our Terms of Service
          </p>
        </div>
      </div>
    );
  }

  // AUTHENTICATED — show dashboard
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}