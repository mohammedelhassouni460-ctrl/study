/**
 * Errors safe to show to users. Anything else is logged server-side and
 * replaced by a generic message — users never see stack traces.
 */
export class AppError extends Error {
  constructor(
    public readonly code:
      | "unauthenticated"
      | "forbidden"
      | "not_found"
      | "invalid_input"
      | "rate_limited"
      | "quota_exceeded"
      | "insufficient_credits"
      | "upgrade_required"
      | "not_configured"
      | "ai_unavailable"
      | "ai_refused"
      | "ai_invalid_output"
      | "processing_failed"
      | "conflict",
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const GENERIC_ERROR_MESSAGE = "Une erreur inattendue est survenue. Réessaie dans un instant.";
