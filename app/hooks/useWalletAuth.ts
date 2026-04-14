'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useUser } from '@/app/store/useUser';

/**
 * Detects wallet connection via RainbowKit/wagmi and authenticates
 * with the backend by signing a message and getting a JWT.
 */
export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { token, setUser } = useUser();
  const authingRef = useRef(false);

  useEffect(() => {
    if (!isConnected || !address) return;
    // Already have a valid token
    if (token && token.includes('.')) return;
    if (authingRef.current) return;
    authingRef.current = true;

    (async () => {
      try {
        const message = `Sign in to XERON\nWallet: ${address}\nTimestamp: ${Date.now()}`;
        const signature = await signMessageAsync({ message });

        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, message, signature }),
        });

        if (res.ok) {
          const { token: newToken, user } = await res.json();
          setUser({
            userId: user.id,
            walletAddress: user.walletAddress,
            displayName: user.displayName || address.slice(0, 8),
            token: newToken,
          });
        }
      } catch (err) {
        console.error('Wallet auth failed:', err);
      } finally {
        authingRef.current = false;
      }
    })();
  }, [isConnected, address, token, setUser, signMessageAsync]);
}