"use client";

import { useAppKitAccount, useAppKit } from "@reown/appkit/react";

interface WalletButtonProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function WalletButton({
  variant = "secondary",
  size = "md",
  className = "",
}: WalletButtonProps) {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();

  const baseClasses = "rounded-md font-medium transition-colors";
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-3 py-2 text-sm sm:px-4",
    lg: "px-6 py-3 text-sm",
  };

  const variantClasses = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700",
    secondary:
      "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800",
  };

  const handleClick = () => {
    if (isConnected) {
      open({ view: "Account" });
    } else {
      open({ view: "Connect" });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {isConnected ? formatAddress(address || "") : "Connect"}
    </button>
  );
}
