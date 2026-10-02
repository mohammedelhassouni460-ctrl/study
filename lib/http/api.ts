import "server-only";

import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { rateLimit, type RateLimitName } from "@/lib/rate-limit";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";

import { AppError, GENERIC_ERROR_MESSAGE } from "./errors";

export interface ApiContext {
  user: User;
  supabase: ServerSupabaseClient;
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    if (error.code === "rate_limited" && typeof error.details?.retryAfter === "number") {
      headers["Retry-After"] = String(error.details.retryAfter);
    }
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } },
      { status: error.status, headers },
    );
  }
  console.error("[api] unexpected error", error);
  return NextResponse.json({ error: { code: "internal", message: GENERIC_ERROR_MESSAGE } }, { status: 500 });
}

export async function requireApiUser(): Promise<ApiContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("unauthenticated", "Ta session a expiré. Reconnecte-toi.", 401);
  return { user, supabase };
}

export async function enforceRateLimit(name: RateLimitName, userId: string) {
  const result = await rateLimit(name, userId);
  if (!result.success) {
    throw new AppError(
      "rate_limited",
      `Trop de requêtes. Réessaie dans ${result.retryAfter} s.`,
      429,
      { retryAfter: result.retryAfter },
    );
  }
}

export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("invalid_input", "Requête invalide.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("invalid_input", parsed.error.issues[0]?.message ?? "Requête invalide.", 400);
  }
  return parsed.data;
}

/**
 * Wraps a route handler: authenticates, rate-limits, converts thrown errors
 * into JSON responses (never leaking internals).
 */
export function apiHandler(
  options: { rateLimit?: RateLimitName },
  handler: (request: Request, ctx: ApiContext) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      const ctx = await requireApiUser();
      if (options.rateLimit) await enforceRateLimit(options.rateLimit, ctx.user.id);
      return await handler(request, ctx);
    } catch (error) {
      return jsonError(error);
    }
  };
}
