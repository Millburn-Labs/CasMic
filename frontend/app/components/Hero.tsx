"use client";

export default function Hero() {
  const handleGetStarted = () => {
    // TODO: Implement wallet connection or navigation
    console.log("Get Started clicked");
  };

  const handleLearnMore = () => {
    // Scroll to features section
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl lg:text-6xl">
          Next-Generation
          <br />
          Governance Platform
        </h1>
        <p className="mt-6 text-base leading-7 text-neutral-600 dark:text-neutral-400 sm:text-lg sm:leading-8">
          Built on Base Network with sophisticated voting mechanisms, evolving
          NFT badges, and gamified participation rewards.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={handleGetStarted}
            className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            Get Started
          </button>
          <button
            onClick={handleLearnMore}
            className="w-full rounded-md border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:w-auto"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
