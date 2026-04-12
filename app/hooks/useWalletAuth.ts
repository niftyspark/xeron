'use client';

import { useCallback, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useUser } from '@/app/store/useUser';

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setUser, logout, isAuthenticated, token } = useUser();

  const authenticate = useCallback(async () => {
    if (!address) return;

    try {
      const nonce = `Sign in to XERON\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message: nonce });

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message: nonce }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          userId: data.userId,
          walletAddress: address,
          displayName: data.displayName,
          token: data.token,
        });
      }
    } catch (err) {
      console.error('Auth failed:', err);
    }
  }, [address, signMessageAsync, setUser]);

  useEffect(() => {
    if (!isConnected) {
      logout();
    }
  }, [isConnected, logout]);

  return {
    address,
    isConnected,
    isAuthenticated,
    token,
    authenticate,
    logout,
  };
}
