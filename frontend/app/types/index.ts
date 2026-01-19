export interface Feature {
  title: string;
  description: string;
}

export interface ReputationLevelData {
  name: string;
  level: number;
  pointsThreshold: string;
  abilities: string[];
  isHighlighted?: boolean;
}
