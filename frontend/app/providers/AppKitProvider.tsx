"use client";

/**
 * AppKit Provider Setup
 * 
 * Required environment variable:
 * - NEXT_PUBLIC_REOWN_PROJECT_ID: Get your project ID from https://cloud.reown.com
 * 
 * Configured networks:
 * - Base Mainnet (Chain ID: 8453)
 * - Base Sepolia Testnet (Chain ID: 84532)
 */

import { AppKitProvider as ReownAppKitProvider } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Configure Base networks
const baseMainnet = {
  ...base,
  name: "Base",
};

const baseSepoliaTestnet = {
  ...baseSepolia,
  name: "Base Sepolia",
};

// Get project ID
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

if (!projectId) {
  console.warn("NEXT_PUBLIC_REOWN_PROJECT_ID is not set. Wallet connection will not work.");
}

// Create Wagmi adapter (must be outside component)
// The adapter automatically detects injected wallets (MetaMask, Rabby, etc.)
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [baseMainnet, baseSepoliaTestnet],
  ssr: true,
});

// React Query client (must be outside component)
const queryClient = new QueryClient();

// AppKit metadata
const metadata = {
  name: "CasperMic",
  description: "Next-Generation Governance Platform",
  url: typeof window !== "undefined" ? window.location.origin : "https://caspermic.xyz",
  icons: [],
};

export default function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReownAppKitProvider
      projectId={projectId}
      networks={[baseMainnet, baseSepoliaTestnet]}
      adapters={[wagmiAdapter]}
      metadata={metadata}
      features={{
        analytics: false, // Disabled to reduce console noise
        email: true,
        socials: ["github", "discord"],
      }}
      themeMode="light"
      themeVariables={{
        "--w3m-accent": "#2563eb",
      }}
      enableEIP6963={true}
      enableCoinbase={true}
      enableInjected={true}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ReownAppKitProvider>
  );
}
