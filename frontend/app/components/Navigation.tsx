"use client";

import WalletButton from "./WalletButton";

export default function Navigation() {
  return (
    <nav className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
            CasperMic
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="#features"
              className="hidden text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:block"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hidden text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 sm:block"
            >
              How It Works
            </a>
            <WalletButton variant="secondary" size="md" />
          </div>
        </div>
      </div>
    </nav>
  );
}


