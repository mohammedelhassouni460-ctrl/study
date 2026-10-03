import "server-only";

import type { AnalyticsEvent, AnalyticsProperties } from "./events";

/**
 * Server-side product analytics. Sends to PostHog's capture API when
 * NEXT_PUBLIC_POSTHOG_KEY is configured, otherwise does nothing.
 * Never throws: analytics must not break a user flow.
 */
export async function track(
  distinctId: string,
  event: AnalyticsEvent,
  properties: AnalyticsProperties = {},
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
  try {
    await fetch(`${host.replace(/\/$/, "")}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: "studyos-server" },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    // Swallow: analytics outages must not affect the product.
  }
}
