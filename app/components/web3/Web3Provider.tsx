'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const Web3ProviderInner = dynamic(
  () => import('./Web3ProviderInner').then((mod) => mod.Web3ProviderInner),
  { ssr: false }
);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <Web3ProviderInner>{children}</Web3ProviderInner>;
}
