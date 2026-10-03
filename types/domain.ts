import type { Tables } from "./database";

export type Profile = Tables<"profiles">;
export type Subject = Tables<"subjects">;
export type DocumentRow = Tables<"documents">;
export type Topic = Tables<"topics">;
export type Summary = Tables<"summaries">;
export type Flashcard = Tables<"flashcards">;
export type Quiz = Tables<"quizzes">;
export type QuizQuestion = Tables<"quiz_questions">;
export type QuizAttempt = Tables<"quiz_attempts">;
export type ChatMessage = Tables<"chat_messages">;
export type StudySession = Tables<"study_sessions">;
export type Subscription = Tables<"subscriptions">;

export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

/** A question as sent to the browser during a quiz: no correct answer, no explanation. */
export interface PublicQuizQuestion {
  id: string;
  position: number;
  question: string;
  choices: string[];
  topicName: string | null;
}

export interface ChatSource {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  excerpt: string;
  similarity: number;
  page?: number;
}
