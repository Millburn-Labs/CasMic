import { ReputationLevelData } from "../types";

interface ReputationLevelProps {
  level: ReputationLevelData;
}

export default function ReputationLevel({ level }: ReputationLevelProps) {
  const isHighlighted = level.isHighlighted;

  const containerClasses = isHighlighted
    ? "rounded-md border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950"
    : "rounded-md border border-neutral-200 p-6 dark:border-neutral-800";

  const titleClasses = isHighlighted
    ? "text-lg font-semibold text-blue-900 dark:text-blue-50"
    : "text-lg font-semibold text-neutral-900 dark:text-neutral-50";

  const pointsClasses = isHighlighted
    ? "mt-1 text-sm text-blue-600 dark:text-blue-400"
    : "mt-1 text-sm text-neutral-500 dark:text-neutral-500";

  const abilitiesClasses = isHighlighted
    ? "mt-3 space-y-1 text-sm text-blue-800 dark:text-blue-300"
    : "mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-400";

  const badgeClasses = isHighlighted
    ? "rounded-md border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-200"
    : "rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

  return (
    <div className={containerClasses}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className={titleClasses}>{level.name}</h3>
          <p className={pointsClasses}>{level.pointsThreshold} reputation points</p>
          <ul className={abilitiesClasses}>
            {level.abilities.map((ability, index) => (
              <li key={index}>• {ability}</li>
            ))}
          </ul>
        </div>
        <span className={badgeClasses}>Level {level.level}</span>
      </div>
    </div>
  );
}



