"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Filter out WalletConnect and keep only injected wallets
  const injectedConnectors = connectors.filter(
    (connector) =>
      connector.type === "injected" ||
      connector.id === "metaMaskSDK" ||
      connector.id === "coinbaseWalletSDK" ||
      connector.name?.toLowerCase().includes("metamask") ||
      connector.name?.toLowerCase().includes("rabby") ||
      connector.name?.toLowerCase().includes("coinbase") ||
      connector.id?.includes("injected")
  );

  useEffect(() => {
    if (isConnected) {
      onClose();
    }
  }, [isConnected, onClose]);

  if (!isOpen) return null;

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {isConnected ? "Account" : "Connect Wallet"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Connected</p>
              <p className="mt-1 font-mono text-sm text-neutral-900 dark:text-neutral-50">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {injectedConnectors.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
                No wallet extensions detected. Please install MetaMask, Rabby, or another browser
                wallet extension.
              </p>
            ) : (
              injectedConnectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector.id)}
                  disabled={isPending}
                  className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div className="flex items-center justify-between">
                    <span>{connector.name || "Injected Wallet"}</span>
                    {isPending && (
                      <span className="text-xs text-neutral-500">Connecting...</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
