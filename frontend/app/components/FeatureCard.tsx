import { Feature } from "../types";

interface FeatureCardProps {
  feature: Feature;
}

export default function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
        {feature.description}
      </p>
    </div>
  );
}
