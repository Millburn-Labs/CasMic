import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WagmiProviderWrapper from "./providers/WagmiProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CasperMic - Next-Generation Governance Platform",
  description: "A next-generation governance platform built on Base Network featuring sophisticated voting mechanisms, evolving NFT badges, and gamified participation rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WagmiProviderWrapper>{children}</WagmiProviderWrapper>
      </body>
    </html>
  );
}
