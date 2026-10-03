import "server-only";

import { env } from "@/lib/env";
import { addDays, daysBetween, toISODate } from "@/lib/learning/dates";
import { averageMastery } from "@/lib/learning/mastery";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmail } from "./send";
import { studyReminderEmail, weeklyReportEmail, type ReminderSession } from "./templates";

type Admin = ReturnType<typeof createAdminClient>;
type Kind = "study_reminder" | "weekly_report";

export interface DigestResult {
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
}

const PAGE = 1000;

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
}

/** Onboarded users who opted into a notification (preferences live in profiles.notification_preferences). */
async function recipients(admin: Admin, preference: "email_reminders" | "weekly_report"): Promise<Recipient[]> {
  const out: Recipient[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, full_name, timezone, notification_preferences")
      .not("onboarded_at", "is", null)
      .not("email", "is", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const p of data ?? []) {
      const prefs = (p.notification_preferences ?? {}) as Record<string, unknown>;
      if (prefs[preference] === true && p.email) {
        out.push({ id: p.id, email: p.email, name: p.full_name?.split(" ")[0] ?? null, timezone: p.timezone });
      }
    }
    if (!data || data.length < PAGE) return out;
  }
}

/** Claims the (user, kind, period) slot; false if this email was already sent. */
async function claim(admin: Admin, userId: string, kind: Kind, periodKey: string) {
  const { data, error } = await admin
    .from("email_log")
    .upsert({ user_id: userId, kind, period_key: periodKey }, { onConflict: "user_id,kind,period_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return data?.[0]?.id ?? null;
}

async function deliver(admin: Admin, recipient: Recipient, kind: Kind, periodKey: string, build: () => { subject: string; html: string; text: string }) {
  const logId = await claim(admin, recipient.id, kind, periodKey);
  if (!logId) return "skipped" as const;
  try {
    const sent = await sendEmail({ to: recipient.email, ...build() });
    if (!sent) {
      await admin.from("email_log").delete().eq("id", logId);
      return "skipped" as const;
    }
    return "sent" as const;
  } catch (error) {
    console.error(`[email] ${kind} failed`, error instanceof Error ? error.message : error);
    await admin.from("email_log").delete().eq("id", logId); // retried by the next run
    return "failed" as const;
  }
}

/** Daily: emails users who have planned sessions today (in their own timezone). */
export async function runStudyReminders(now = new Date()): Promise<DigestResult> {
  const admin = createAdminClient();
  const appUrl = env().NEXT_PUBLIC_APP_URL;
  const users = await recipients(admin, "email_reminders");
  const result: DigestResult = { candidates: 0, sent: 0, skipped: 0, failed: 0 };
  if (users.length === 0) return result;

  const utcToday = toISODate(now, "UTC");
  const byUser = new Map(users.map((u) => [u.id, u]));
  const ids = users.map((u) => u.id);
  const sessions: { user_id: string; scheduled_date: string; title: string; duration_minutes: number; subject_id: string }[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await admin
      .from("study_sessions")
      .select("user_id, scheduled_date, title, duration_minutes, subject_id, position")
      .in("user_id", ids.slice(i, i + 200))
      .eq("status", "planned")
      .gte("scheduled_date", addDays(utcToday, -1))
      .lte("scheduled_date", addDays(utcToday, 1))
      .order("position");
    if (error) throw error;
    sessions.push(...(data ?? []));
  }

  const subjectIds = [...new Set(sessions.map((s) => s.subject_id))];
  const { data: subjects } = subjectIds.length
    ? await admin.from("subjects").select("id, name").in("id", subjectIds)
    : { data: [] };
  const subjectNames = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const today = new Map<string, ReminderSession[]>();
  for (const s of sessions) {
    const user = byUser.get(s.user_id);
    if (!user || s.scheduled_date !== toISODate(now, user.timezone)) continue;
    const list = today.get(s.user_id) ?? [];
    list.push({ title: s.title, subjectName: subjectNames.get(s.subject_id) ?? "", durationMinutes: s.duration_minutes });
    today.set(s.user_id, list);
  }

  for (const [userId, list] of today) {
    const user = byUser.get(userId)!;
    result.candidates += 1;
    const outcome = await deliver(admin, user, "study_reminder", toISODate(now, user.timezone), () =>
      studyReminderEmail({ name: user.name, appUrl, sessions: list }),
    );
    result[outcome] += 1;
  }
  return result;
}

/** Weekly: progress report over the last 7 days. One email per user and ISO week. */
export async function runWeeklyReports(now = new Date()): Promise<DigestResult> {
  const admin = createAdminClient();
  const appUrl = env().NEXT_PUBLIC_APP_URL;
  const users = await recipients(admin, "weekly_report");
  const result: DigestResult = { candidates: users.length, sent: 0, skipped: 0, failed: 0 };
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  for (const user of users) {
    const today = toISODate(now, user.timezone);
    const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
    const weekKey = addDays(today, -weekday);

    const [attempts, reviews, sessions, subjects] = await Promise.all([
      admin.from("quiz_attempts").select("percentage").eq("user_id", user.id).not("completed_at", "is", null).gte("completed_at", since),
      admin.from("flashcard_reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("reviewed_at", since),
      admin.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "done").gte("completed_at", since),
      admin.from("subjects").select("name, exam_date, topics(name, mastery_score, attempts_count)").eq("user_id", user.id),
    ]);

    const scores = (attempts.data ?? []).map((a) => Number(a.percentage));
    const allTopics = (subjects.data ?? []).flatMap((s) => s.topics.map((t) => ({ ...t, subjectName: s.name })));
    const activity = scores.length + (reviews.count ?? 0) + (sessions.count ?? 0);
    if (allTopics.length === 0 && activity === 0) {
      result.skipped += 1; // nothing to report yet
      continue;
    }
    const exams = (subjects.data ?? [])
      .filter((s) => s.exam_date && s.exam_date >= today)
      .sort((a, b) => (a.exam_date! < b.exam_date! ? -1 : 1));

    const outcome = await deliver(admin, user, "weekly_report", weekKey, () =>
      weeklyReportEmail({
        name: user.name,
        appUrl,
        stats: {
          quizzes: scores.length,
          averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          flashcardsReviewed: reviews.count ?? 0,
          sessionsDone: sessions.count ?? 0,
          globalMastery: averageMastery(allTopics.map((t) => t.mastery_score)),
          weakTopics: allTopics
            .filter((t) => t.attempts_count > 0 && t.mastery_score < 60)
            .sort((a, b) => a.mastery_score - b.mastery_score)
            .slice(0, 3)
            .map((t) => ({ name: t.name, subjectName: t.subjectName, mastery: t.mastery_score })),
          nextExam: exams[0] ? { subjectName: exams[0].name, daysLeft: daysBetween(today, exams[0].exam_date!) } : null,
        },
      }),
    );
    result[outcome] += 1;
  }
  return result;
}
