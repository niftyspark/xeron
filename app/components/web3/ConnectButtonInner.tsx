'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/app/store/useUser';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function WalletConnectButtonInner({ className = '' }: { className?: string }) {
  const { isAuthenticated, setUser } = useUser();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleInitialized = useRef(false);

  const handleGoogleResponse = useCallback(async (response: any) => {
    const credential = response.credential;
    if (!credential) return;

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Google auth failed:', err.error);
        return;
      }
      const { token, user } = await res.json();
      setUser({
        userId: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        token,
      });
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Google sign-in error:', err);
    }
  }, [setUser]);

  useEffect(() => {
    if (googleInitialized.current || !GOOGLE_CLIENT_ID || isAuthenticated) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!(window as any).google?.accounts?.id) return;
      (window as any).google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      if (googleBtnRef.current) {
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 250,
        });
      }
      googleInitialized.current = true;
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup not strictly needed but good practice
    };
  }, [handleGoogleResponse, isAuthenticated]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none' as const,
                userSelect: 'none' as const,
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={openConnectModal}
                      className={`w-[250px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/25 ${className}`}
                    >
                      Connect Wallet
                    </button>

                    <div className="flex items-center gap-3 w-[250px]">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[10px] text-white/30">or</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Google Sign-In button rendered by Google's SDK */}
                    <div ref={googleBtnRef} className="flex justify-center" />

                    {/* Fallback if Google SDK fails to load */}
                    {!GOOGLE_CLIENT_ID && (
                      <p className="text-[10px] text-white/20 text-center">
                        Google sign-in requires NEXT_PUBLIC_GOOGLE_CLIENT_ID
                      </p>
                    )}
                  </div>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img alt={chain.name ?? 'Chain'} src={chain.iconUrl} className="w-5 h-5 rounded-full" />
                    )}
                    <span className="text-sm text-white/80">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <span className="text-sm text-white font-medium">{account.displayName}</span>
                    {account.displayBalance && (
                      <span className="text-sm text-white/50">({account.displayBalance})</span>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}