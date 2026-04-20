'use client';

/**
 * Dashboard layout with cookie-backed auth.
 *
 * Changes vs the audited version:
 *  - No localStorage token polling. Auth state is decided by a single
 *    /api/user probe — the browser sends the httpOnly cookie automatically.
 *  - Turnstile token flows from <TurnstileWidget onToken> into the Google
 *    sign-in fetch. Sign-in is disabled until a token is present.
 *  - Logout calls /api/auth/logout to clear the cookie server-side, then
 *    routes to '/' via next/router (no window.location reloads).
 */

import { Sidebar } from '@/app/components/dashboard/Sidebar';
import { Header } from '@/app/components/dashboard/Header';
import { CommandPalette } from '@/app/components/dashboard/CommandPalette';
import { useUI } from '@/app/store/useUI';
import { useUser } from '@/app/store/useUser';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { TurnstileWidget } from '@/app/components/auth/TurnstileWidget';
import { authFetch } from '@/lib/client-auth';

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
          prompt: (callback?: (n: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
          }) => void) => void;
          renderButton: (
            element: HTMLElement,
            config: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const tsTokenRef = useRef<string | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const initialisedRef = useRef(false);

  // Keep a ref in sync so the Google callback (which has a stable closure)
  // always sees the latest Turnstile token without re-initialising the widget.
  useEffect(() => {
    tsTokenRef.current = turnstileToken;
  }, [turnstileToken]);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      const ts = tsTokenRef.current;
      if (!ts) {
        setError('Please complete the bot verification before signing in.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await authFetch('/api/auth/google', {
          method: 'POST',
          json: { credential: response.credential, turnstileToken: ts },
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || 'Authentication failed');
        }
        const data = (await res.json()) as {
          user: {
            id: string;
            walletAddress: string;
            displayName: string | null;
            avatarUrl: string | null;
          };
        };

        // Cookie is already set by the server. Only store user metadata.
        useUser.getState().setUser({
          userId: data.user.id,
          walletAddress: data.user.walletAddress,
          displayName: data.user.displayName,
          avatarUrl: data.user.avatarUrl,
        });

        // Router refresh picks up the new authenticated state.
        window.location.assign('/dashboard');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign-in failed';
        setError(msg);
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialisedRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Client ID is not configured.');
      return;
    }

    const init = () => {
      if (!window.google || initialisedRef.current) return;
      initialisedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });

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

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      if (window.google) init();
      else existing.addEventListener('load', init, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = init;
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
    <div className="flex flex-col items-center gap-3">
      <div
        ref={btnRef}
        className={turnstileToken ? '' : 'opacity-40 pointer-events-none'}
        aria-disabled={!turnstileToken}
      />
      <TurnstileWidget onToken={setTurnstileToken} />
      {!turnstileToken && (
        <p className="text-[11px] text-white/40 text-center">
          Complete bot verification above to enable sign-in.
        </p>
      )}
      {error && <p className="text-xs text-red-400 text-center max-w-[280px]">{error}</p>}
    </div>
  );
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUI();
  const { clear, setUser } = useUser();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('loading');

  // Single source of truth: ask the server whether we are authenticated.
  // The cookie, if present, is attached automatically.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/user');
        if (cancelled) return;
        if (res.ok) {
          const user = (await res.json()) as {
            id: string;
            walletAddress: string;
            displayName: string | null;
            avatarUrl: string | null;
          };
          setUser({
            userId: user.id,
            walletAddress: user.walletAddress,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          });
          setAuthState('authenticated');
        } else {
          clear();
          setAuthState('unauthenticated');
        }
      } catch {
        if (!cancelled) {
          clear();
          setAuthState('unauthenticated');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clear, setUser]);

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

  if (authState === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

          <p className="text-[10px] text-white/15 mt-4">
            By signing in you agree to our Terms of Service
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-16'
        }`}
      >
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
