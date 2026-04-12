'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnectButtonInner({ className = '' }: { className?: string }) {
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
                  <button
                    onClick={openConnectModal}
                    className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/25 ${className}`}
                  >
                    Connect Wallet
                  </button>
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
                    {chain.hasIcon && (
                      <div className="w-5 h-5">
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain'}
                            src={chain.iconUrl}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                      </div>
                    )}
                    <span className="text-sm text-white/80">{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <span className="text-sm text-white font-medium">
                      {account.displayName}
                    </span>
                    <span className="text-sm text-white/50">
                      {account.displayBalance ? `(${account.displayBalance})` : ''}
                    </span>
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
