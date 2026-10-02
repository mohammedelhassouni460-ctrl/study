/** Server-side quiz correction. Pure: the client never sees correct answers before submitting. */

export interface ScorableQuestion {
  id: string;
  correctAnswer: number;
  topicId: string | null;
  choicesCount: number;
}

export interface QuestionResult {
  questionId: string;
  answer: number | null;
  isCorrect: boolean;
}

export interface TopicResult {
  topicId: string;
  correct: number;
  total: number;
}

export interface QuizScore {
  score: number;
  total: number;
  /** 0–100, one decimal. */
  percentage: number;
  /** French-style grade out of 20, one decimal. */
  gradeOn20: number;
  results: QuestionResult[];
  byTopic: TopicResult[];
  /** Topics with less than 60 % correct answers, weakest first. */
  weakTopicIds: string[];
  strongTopicIds: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scoreQuiz(
  questions: ScorableQuestion[],
  answers: Record<string, number | null | undefined>,
): QuizScore {
  const topicMap = new Map<string, TopicResult>();
  const results: QuestionResult[] = questions.map((question) => {
    const raw = answers[question.id];
    const answer =
      typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < question.choicesCount
        ? raw
        : null;
    const isCorrect = answer !== null && answer === question.correctAnswer;

    if (question.topicId) {
      const entry = topicMap.get(question.topicId) ?? { topicId: question.topicId, correct: 0, total: 0 };
      entry.total += 1;
      if (isCorrect) entry.correct += 1;
      topicMap.set(question.topicId, entry);
    }
    return { questionId: question.id, answer, isCorrect };
  });

  const total = questions.length;
  const score = results.filter((r) => r.isCorrect).length;
  const ratio = total === 0 ? 0 : score / total;
  const byTopic = [...topicMap.values()];
  const rate = (t: TopicResult) => t.correct / t.total;

  return {
    score,
    total,
    percentage: round1(ratio * 100),
    gradeOn20: round1(ratio * 20),
    results,
    byTopic,
    weakTopicIds: byTopic
      .filter((t) => rate(t) < 0.6)
      .sort((a, b) => rate(a) - rate(b))
      .map((t) => t.topicId),
    strongTopicIds: byTopic.filter((t) => rate(t) >= 0.8).map((t) => t.topicId),
  };
}
