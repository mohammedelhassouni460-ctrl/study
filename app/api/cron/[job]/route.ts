import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { runStudyReminders, runWeeklyReports } from "@/lib/email/digests";
import { isEmailConfigured } from "@/lib/email/send";
import { env } from "@/lib/env";

export const maxDuration = 300;

const JOBS = { reminders: runStudyReminders, "weekly-report": runWeeklyReports } as const;

function authorized(request: Request) {
  const secret = env().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Scheduled jobs (Vercel Cron, see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/cron/[job]">) {
  if (!authorized(request)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { job } = await params;
  const run = JOBS[job as keyof typeof JOBS];
  if (!run) return NextResponse.json({ error: "Tâche inconnue." }, { status: 404 });
  if (!isEmailConfigured()) return NextResponse.json({ skipped: "RESEND_API_KEY manquante" });

  try {
    const result = await run();
    console.info(`[cron] ${job}`, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[cron] ${job} failed`, error);
    return NextResponse.json({ error: "Échec de la tâche." }, { status: 500 });
  }
}
