"use client";

export default function CTA() {
  const handleConnectWallet = () => {
    // TODO: Implement wallet connection
    console.log("Connect Wallet clicked");
  };

  const handleViewDocs = () => {
    // TODO: Implement navigation to documentation
    console.log("View Documentation clicked");
  };

  return (
    <section className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
            Ready to Participate?
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            Join the next generation of decentralized governance on Base Network.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleConnectWallet}
              className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              Connect Wallet
            </button>
            <button
              onClick={handleViewDocs}
              className="w-full rounded-md border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto"
            >
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
