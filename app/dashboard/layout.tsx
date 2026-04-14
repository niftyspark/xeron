'use client';

import { Sidebar } from '@/app/components/dashboard/Sidebar';
import { Header } from '@/app/components/dashboard/Header';
import { CommandPalette } from '@/app/components/dashboard/CommandPalette';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { useEffect, useState, useRef } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUI();
  const { token, setUser } = useUser();
  const [ready, setReady] = useState(false);
  const didAuth = useRef(false);

  useEffect(() => {
    // Already have token from persisted store
    if (token) {
      setReady(true);
      return;
    }

    // Check localStorage directly
    try {
      const raw = localStorage.getItem('xeron-user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.token) {
          setReady(true);
          return;
        }
      }
    } catch {}

    // No token — auto-create guest
    if (didAuth.current) {
      setReady(true);
      return;
    }
    didAuth.current = true;

    fetch('/api/auth/guest', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('Guest auth failed');
        return res.json();
      })
      .then(({ token: t, user }) => {
        setUser({
          userId: user.id,
          walletAddress: user.walletAddress,
          displayName: user.displayName,
          token: t,
        });
      })
      .catch(err => {
        console.error('Auto auth failed:', err);
        // Create a temporary local-only session so the UI doesn't crash
        const tempId = crypto.randomUUID();
        setUser({
          userId: tempId,
          walletAddress: `0x${'0'.repeat(40)}`,
          displayName: 'Guest',
          token: 'local-session',
        });
      })
      .finally(() => setReady(true));
  }, [token, setUser]);

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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/30">Loading XERON...</p>
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