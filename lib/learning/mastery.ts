/**
 * Mastery engine. A topic's mastery is a 0–100 score updated after every
 * answer (quiz question or flashcard review). Pure and deterministic.
 *
 *   0       → jamais étudié
 *   1–39    → faible
 *   40–64   → moyen
 *   65–89   → maîtrisé
 *   90–100  → très maîtrisé
 */

export type QuestionDifficulty = "easy" | "medium" | "hard" | "exam";

export interface MasteryInput {
  /** Current mastery score (0–100). */
  currentScore: number;
  isCorrect: boolean;
  difficulty?: QuestionDifficulty;
  /** Number of answers recorded for this topic BEFORE this one. */
  attempts?: number;
  /** Number of correct answers recorded BEFORE this one. */
  correctCount?: number;
}

const DIFFICULTY_WEIGHT: Record<QuestionDifficulty, number> = {
  easy: 0.8,
  medium: 1,
  hard: 1.2,
  exam: 1.3,
};

/** Minimal bump for a first (wrong) contact with a topic: it has been studied. */
const EXPOSURE_SCORE = 5;

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function calculateMasteryScore({
  currentScore,
  isCorrect,
  difficulty = "medium",
  attempts = 0,
  correctCount = 0,
}: MasteryInput): number {
  const score = clampScore(currentScore);
  const weight = DIFFICULTY_WEIGHT[difficulty];
  const safeAttempts = Math.max(0, attempts);
  // Early answers move the score a lot, later ones refine it.
  const learningRate = Math.max(0.15, 0.5 / Math.sqrt(safeAttempts + 1));

  if (isCorrect) {
    return clampScore(score + learningRate * weight * (100 - score));
  }

  // Never studied: a wrong first answer still counts as exposure.
  if (score === 0 && safeAttempts === 0) return EXPOSURE_SCORE;

  // A solid history softens the penalty (one slip ≠ forgotten), and missing an
  // easy question is penalised more than missing a hard one.
  const historicalAccuracy = safeAttempts > 0 ? Math.min(1, correctCount / safeAttempts) : 0;
  const penalty = learningRate * score * (1 / weight) * (1 - 0.5 * historicalAccuracy);
  return clampScore(Math.max(score - penalty, safeAttempts === 0 ? 0 : 1));
}

export type MasteryLevel = "never" | "weak" | "medium" | "mastered" | "expert";

export function masteryLevel(score: number): MasteryLevel {
  const s = clampScore(score);
  if (s === 0) return "never";
  if (s < 40) return "weak";
  if (s < 65) return "medium";
  if (s < 90) return "mastered";
  return "expert";
}

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  never: "Jamais étudié",
  weak: "Faible",
  medium: "Moyen",
  mastered: "Maîtrisé",
  expert: "Très maîtrisé",
};

/** Average mastery across topics (0 when there is none). */
export function averageMastery(scores: number[]): number {
  if (scores.length === 0) return 0;
  return clampScore(scores.reduce((sum, s) => sum + clampScore(s), 0) / scores.length);
}

/** Topics sorted weakest first (ties: least practised first). */
export function weakestTopics<T extends { mastery_score: number; attempts_count?: number }>(
  topics: T[],
  limit = 3,
): T[] {
  return [...topics]
    .sort(
      (a, b) =>
        a.mastery_score - b.mastery_score || (a.attempts_count ?? 0) - (b.attempts_count ?? 0),
    )
    .slice(0, limit);
}
