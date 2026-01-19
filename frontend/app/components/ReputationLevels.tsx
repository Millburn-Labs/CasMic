import ReputationLevel from "./ReputationLevel";
import { ReputationLevelData } from "../types";

const reputationLevels: ReputationLevelData[] = [
  {
    name: "Newcomer",
    level: 0,
    pointsThreshold: "0",
    abilities: ["Basic Voting", "View Proposals"],
  },
  {
    name: "Member",
    level: 1,
    pointsThreshold: "100+",
    abilities: ["Basic Voting", "View Proposals", "Create Comments"],
  },
  {
    name: "Contributor",
    level: 2,
    pointsThreshold: "500+",
    abilities: [
      "Basic Voting",
      "View Proposals",
      "Create Comments",
      "Create Proposals",
    ],
  },
  {
    name: "Veteran",
    level: 3,
    pointsThreshold: "2,000+",
    abilities: [
      "Basic Voting",
      "View Proposals",
      "Create Comments",
      "Create Proposals",
      "Delegate Voting",
    ],
  },
  {
    name: "Elder",
    level: 4,
    pointsThreshold: "10,000+",
    abilities: [
      "Basic Voting",
      "View Proposals",
      "Create Comments",
      "Create Proposals",
      "Delegate Voting",
      "Moderate Proposals",
      "Elder Governance Powers",
    ],
    isHighlighted: true,
  },
];

export default function ReputationLevels() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          Reputation Levels
        </h2>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Your participation unlocks new abilities and governance powers.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-4xl">
        <div className="space-y-6">
          {reputationLevels.map((level) => (
            <ReputationLevel key={level.level} level={level} />
          ))}
        </div>
      </div>
    </section>
  );
}


