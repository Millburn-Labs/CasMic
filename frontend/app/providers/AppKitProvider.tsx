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

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createConfig, http } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

// Configure Base networks
const baseMainnet = {
  ...base,
  name: "Base",
};

const baseSepoliaTestnet = {
  ...baseSepolia,
  name: "Base Sepolia",
};

// Wagmi config
const wagmiConfig = createConfig({
  chains: [baseMainnet, baseSepoliaTestnet],
  providers: [publicProvider()],
  transports: {
    [baseMainnet.id]: http(),
    [baseSepoliaTestnet.id]: http(),
  },
});

// React Query client
const queryClient = new QueryClient();

// AppKit metadata
const metadata = {
  name: "CasperMic",
  description: "Next-Generation Governance Platform",
  url: typeof window !== "undefined" ? window.location.origin : "https://caspermic.xyz",
  icons: [],
};

// Create AppKit
const AppKit = createAppKit({
  adapters: [WagmiAdapter({ wagmiConfig })],
  networks: [baseMainnet, baseSepoliaTestnet],
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "",
  metadata,
  features: {
    analytics: true,
    email: true,
    socials: ["github", "twitter", "discord"],
  },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#2563eb",
  },
});

export default function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppKit.Provider>{children}</AppKit.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
