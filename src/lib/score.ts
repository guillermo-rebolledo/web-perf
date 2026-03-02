type ScoreVariant = "good" | "warning" | "poor" | "neutral";

export function getScoreVariant(score: number): ScoreVariant {
  if (score >= 90) return "good";
  if (score >= 50) return "warning";
  if (score >= 0) return "poor";
  return "neutral";
}

export const scoreVariantClass: Record<ScoreVariant, string> = {
  good: "text-score-good",
  warning: "text-score-warning",
  poor: "text-score-poor",
  neutral: "text-muted-foreground",
};

export const scoreVariantBgClass: Record<ScoreVariant, string> = {
  good: "bg-score-good",
  warning: "bg-score-warning",
  poor: "bg-score-poor",
  neutral: "bg-muted-foreground",
};
