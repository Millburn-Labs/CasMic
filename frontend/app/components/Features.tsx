import FeatureCard from "./FeatureCard";
import { Feature } from "../types";

const features: Feature[] = [
  {
    title: "Advanced Voting",
    description:
      "Quadratic voting, conviction voting, and batch operations for fair and nuanced decision-making.",
  },
  {
    title: "Reputation System",
    description:
      "Progress from Newcomer to Elder with unlockable abilities based on your participation and contributions.",
  },
  {
    title: "Evolving NFT Badges",
    description:
      "Collect and level up governance achievement badges with IPFS imagery that evolves with your activity.",
  },
  {
    title: "Token Staking",
    description:
      "Lock tokens with time periods for enhanced voting power multipliers, rewarding long-term commitment.",
  },
  {
    title: "Liquid Democracy",
    description:
      "Delegate your voting power to trusted community members while maintaining the ability to vote directly.",
  },
  {
    title: "Onchain Discussions",
    description:
      "Fully decentralized governance debates with threaded comments and upvote/downvote mechanisms.",
  },
];

export default function Features() {
  return (
    <section id="features" className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
            Powerful Governance Features
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            Everything you need for transparent, decentralized decision-making.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
