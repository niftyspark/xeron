'use client';

import { Sidebar } from '@/app/components/dashboard/Sidebar';
import { Header } from '@/app/components/dashboard/Header';
import { CommandPalette } from '@/app/components/dashboard/CommandPalette';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { useEffect, useState } from 'react';
import { WalletConnectButton } from '@/app/components/web3/ConnectButton';
import { useWalletAuth } from '@/app/hooks/useWalletAuth';
import { Sparkles } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUI();
  const { token, isAuthenticated } = useUser();
  const [ready, setReady] = useState(false);
  const [hasAuth, setHasAuth] = useState(false);

  // Auto-authenticate when wallet connects via RainbowKit
  useWalletAuth();

  useEffect(() => {
    // Check for valid JWT token
    let foundToken = false;

    if (token && token.includes('.')) {
      foundToken = true;
    }

    if (!foundToken) {
      try {
        const raw = localStorage.getItem('xeron-user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const t = parsed?.state?.token;
          if (t && t.includes('.')) foundToken = true;
        }
      } catch {}
    }

    setHasAuth(foundToken);
    setReady(true);
  }, [token, isAuthenticated]);

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

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — show sign-in screen
  if (!hasAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/25">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Sign in to XERON</h1>
            <p className="text-white/40 text-sm max-w-xs">
              Connect your wallet or sign in with Google to access your AI agent dashboard.
            </p>
          </div>

          <WalletConnectButton />
        </div>
      </div>
    );
  }

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