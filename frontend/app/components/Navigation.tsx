"use client";

export default function Navigation() {
  const handleConnect = () => {
    // TODO: Implement wallet connection
    console.log("Connect wallet clicked");
  };

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
            <button
              onClick={handleConnect}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:px-4"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


