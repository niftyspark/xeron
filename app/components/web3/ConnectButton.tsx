'use client';

import dynamic from 'next/dynamic';

const ConnectButtonInner = dynamic(
  () => import('./ConnectButtonInner').then((mod) => ({ default: mod.WalletConnectButtonInner })),
  { ssr: false, loading: () => (
    <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl opacity-50">
      Connect Wallet
    </button>
  )}
);

export function WalletConnectButton({ className = '' }: { className?: string }) {
  return <ConnectButtonInner className={className} />;
}
