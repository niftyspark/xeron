'use client';

import { Sidebar } from '@/app/components/dashboard/Sidebar';
import { Header } from '@/app/components/dashboard/Header';
import { CommandPalette } from '@/app/components/dashboard/CommandPalette';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { useSkills } from '@/app/store/useSkills';
import { useEffect, useState, useRef } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUI();
  const { token, isAuthenticated, setUser } = useUser();
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const autoAuthRef = useRef(false);

  // Mount + hydrate
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-authenticate: if no token after mount, create guest account
  useEffect(() => {
    if (!mounted) return;
    if (autoAuthRef.current) return;

    // Check if already authenticated
    if (token && isAuthenticated) {
      setAuthChecked(true);
      return;
    }

    // Also check localStorage directly (zustand might not have hydrated yet)
    try {
      const raw = localStorage.getItem('xeron-user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.token) {
          setAuthChecked(true);
          return;
        }
      }
    } catch {}

    // No token anywhere — auto-create guest account
    autoAuthRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/guest', { method: 'POST' });
        if (res.ok) {
          const { token: newToken, user } = await res.json();
          setUser({
            userId: user.id,
            walletAddress: user.walletAddress,
            displayName: user.displayName,
            token: newToken,
          });
        }
      } catch (err) {
        console.error('Auto guest auth failed:', err);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [mounted, token, isAuthenticated, setUser]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUI.getState().toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!mounted || !authChecked) {
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