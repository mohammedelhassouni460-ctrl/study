import "server-only";

/**
 * Rate limiting abstraction (fixed window).
 * - Upstash Redis REST when UPSTASH_REDIS_REST_URL/TOKEN are set (shared across
 *   serverless instances — recommended in production);
 * - in-memory otherwise (per instance; fine for local dev and single servers).
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export interface RateLimitRule {
  /** Max requests per window. */
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  aiGeneration: { limit: 10, windowSeconds: 60 },
  aiChat: { limit: 20, windowSeconds: 60 },
  documentUpload: { limit: 20, windowSeconds: 60 * 10 },
  documentProcessing: { limit: 10, windowSeconds: 60 * 10 },
  quizSubmit: { limit: 30, windowSeconds: 60 },
  flashcardReview: { limit: 120, windowSeconds: 60 },
  billing: { limit: 10, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return { success: true, limit: rule.limit, remaining: rule.limit - 1, retryAfter: rule.windowSeconds };
  }
  entry.count += 1;
  return {
    success: entry.count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - entry.count),
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}

async function upstashLimit(key: string, rule: RateLimitRule, url: string, token: string): Promise<RateLimitResult> {
  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(rule.windowSeconds), "NX"],
      ["TTL", key],
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const [incr, , ttl] = (await res.json()) as { result: number }[];
  const count = Number(incr.result);
  return {
    success: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfter: Math.max(1, Number(ttl.result)),
  };
}

export async function rateLimit(name: RateLimitName, identifier: string): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  const key = `studyos:rl:${name}:${identifier}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      return await upstashLimit(key, rule, url, token);
    } catch {
      // Redis outage: degrade to per-instance limiting rather than blocking users.
    }
  }
  return memoryLimit(key, rule);
}

/** For tests. */
export function resetMemoryRateLimits() {
  memory.clear();
}
