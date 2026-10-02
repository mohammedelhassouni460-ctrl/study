import type { SessionKind } from "./planner";

/** Where each kind of planned activity happens in the app. */
export function sessionHref(kind: SessionKind, subjectId: string, topicName?: string | null): string {
  const base = `/subjects/${subjectId}`;
  switch (kind) {
    case "flashcards":
      return `${base}/flashcards`;
    case "review":
      return `${base}/summary`;
    case "quiz":
      return `${base}/quiz`;
    case "exercise": {
      const prompt = `Fais-moi un exercice sur ${topicName ?? "ce cours"}.`;
      return `${base}/chat?prompt=${encodeURIComponent(prompt)}`;
    }
  }
}
