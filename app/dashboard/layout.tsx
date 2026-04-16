'use client';

import { Sidebar } from '@/app/components/dashboard/Sidebar';
import { Header } from '@/app/components/dashboard/Header';
import { CommandPalette } from '@/app/components/dashboard/CommandPalette';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Sparkles, LogOut } from 'lucide-react';
import { TurnstileWidget } from '@/app/components/auth/TurnstileWidget';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function hasValidToken(): boolean {
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

function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const btnRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const handleCredential = useCallback(async (response: { credential: string }) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Authentication failed');
      }
      const data = await res.json();
      const token = data.token;
      const user = data.user;

      // Save to zustand store
      useUser.getState().setUser({
        userId: user.id,
        walletAddress: user.walletAddress || '',
        displayName: user.displayName || '',
        token,
      });

      // Force write to localStorage BEFORE reload
      localStorage.setItem('xeron-user', JSON.stringify({
        state: {
          token,
          userId: user.id,
          walletAddress: user.walletAddress || '',
          displayName: user.displayName || '',
          isAuthenticated: true,
          preferredModel: 'anthropic/claude-opus-4.6',
        },
        version: 0,
      }));

      // Reload page
      window.location.reload();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Sign-in failed');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Client ID not configured');
      return;
    }

    // Load script
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const initGoogle = () => {
      if (!window.google || initializedRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });

      // Render the official Google button — this is the most reliable method
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 300,
        });
      }
    };

    if (existingScript) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, [handleCredential]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 px-6 py-3">
        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white/60">Signing in...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Google renders its own button here */}
      <div ref={btnRef} />
      {error && (
        <p className="text-xs text-red-400 text-center max-w-[280px]">{error}</p>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUI();
  const { token, isAuthenticated, logout } = useUser();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  // Check auth on mount
  useEffect(() => {
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
              Sign in with Google to access your AI agent dashboard.
            </p>
          </div>

          <GoogleSignInButton />

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
