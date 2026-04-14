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
  const [error, setError] = useState('');
  const didAuth = useRef(false);

  useEffect(() => {
    // Already have a REAL JWT token (not the old fake 'local-session')
    if (token && token !== 'local-session' && token.includes('.')) {
      setReady(true);
      return;
    }

    // Check localStorage for a real JWT
    try {
      const raw = localStorage.getItem('xeron-user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const t = parsed?.state?.token;
        if (t && t !== 'local-session' && t.includes('.')) {
          setReady(true);
          return;
        }
        // Clear invalid token
        if (t === 'local-session' || (t && !t.includes('.'))) {
          parsed.state.token = null;
          parsed.state.isAuthenticated = false;
          localStorage.setItem('xeron-user', JSON.stringify(parsed));
        }
      }
    } catch {}

    // No valid token — create guest account
    if (didAuth.current) return;
    didAuth.current = true;

    const createGuest = async () => {
      try {
        // Ensure DB tables exist first
        await fetch('/api/setup').catch(() => {});

        const res = await fetch('/api/auth/guest', { method: 'POST' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Auth failed: ${res.status}`);
        }
        const { token: t, user } = await res.json();
        if (!t || !t.includes('.')) {
          throw new Error('Invalid token received');
        }
        setUser({
          userId: user.id,
          walletAddress: user.walletAddress,
          displayName: user.displayName,
          token: t,
        });
        setReady(true);
      } catch (err: any) {
        console.error('Guest auth failed:', err);
        setError(err.message || 'Failed to create account');
        // Retry once
        setTimeout(async () => {
          try {
            const res = await fetch('/api/auth/guest', { method: 'POST' });
            if (res.ok) {
              const { token: t, user } = await res.json();
              if (t && t.includes('.')) {
                setUser({
                  userId: user.id,
                  walletAddress: user.walletAddress,
                  displayName: user.displayName,
                  token: t,
                });
                setError('');
              }
            }
          } catch {}
          setReady(true);
        }, 2000);
      }
    };

    createGuest();
  }, [token, setUser]);

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
          <p className="text-xs text-white/30">Setting up XERON...</p>
          {error && <p className="text-xs text-red-400 max-w-xs text-center">{error}</p>}
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