"use client";

/**
 * Wagmi Provider Setup
 * 
 * Direct wallet connection using wagmi - detects only browser extension wallets
 * (MetaMask, Rabby, Coinbase Wallet, etc.) - NO WalletConnect
 * 
 * Configured networks:
 * - Base Mainnet (Chain ID: 8453)
 * - Base Sepolia Testnet (Chain ID: 84532)
 */

import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, metaMask, coinbaseWallet, eip6963Wallet } from "wagmi/connectors";
import { base, baseSepolia } from "wagmi/chains";

// Configure Base networks
const baseMainnet = {
  ...base,
  name: "Base",
};

const baseSepoliaTestnet = {
  ...baseSepolia,
  name: "Base Sepolia",
};

// Create wagmi config with injected wallet connectors only
const wagmiConfig = createConfig({
  chains: [baseMainnet, baseSepoliaTestnet],
  connectors: [
    // EIP-6963 standard wallet detection (Rabby, MetaMask, etc.)
    ...eip6963Wallet(),
    // Specific wallet connectors
    metaMask(),
    coinbaseWallet({
      appName: "CasperMic",
    }),
    // Generic injected connector for any other wallets
    injected(),
  ],
  transports: {
    [baseMainnet.id]: http(),
    [baseSepoliaTestnet.id]: http(),
  },
});

// React Query client
const queryClient = new QueryClient();

export default function WagmiProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
