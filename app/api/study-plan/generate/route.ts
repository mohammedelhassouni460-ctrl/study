import { NextResponse } from "next/server";

import { track } from "@/lib/analytics/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { listSubjectOverviews, toPlannerSubjects } from "@/lib/data/subjects";
import { apiHandler, parseJsonBody } from "@/lib/http/api";
import { AppError } from "@/lib/http/errors";
import { addDays, toISODate } from "@/lib/learning/dates";
import { generateStudyPlan } from "@/lib/learning/planner";
import { studyPlanRequestSchema } from "@/lib/validations/planner";

/**
 * Builds a revision plan from today: close exams first, then weak topics and
 * due flashcards. Replaces the sessions still planned from today onwards
 * (completed sessions are kept). No AI call, no credits.
 */
export const POST = apiHandler({ rateLimit: "studyPlan" }, async (request, { user, supabase }) => {
  const body = await parseJsonBody(request, studyPlanRequestSchema);
  const [profile, subjects] = await Promise.all([getCurrentProfile(), listSubjectOverviews()]);
  if (subjects.length === 0) throw new AppError("invalid_input", "Crée d'abord une matière pour générer ton planning.", 400);

  const today = toISODate(new Date(), profile?.timezone ?? "Europe/Paris");
  const dailyMinutes = body.dailyMinutes ?? profile?.daily_study_minutes ?? 45;
  const sessions = generateStudyPlan({
    startDate: today,
    dailyMinutes,
    horizonDays: body.horizonDays,
    subjects: toPlannerSubjects(subjects),
  });
  if (sessions.length === 0) {
    throw new AppError("invalid_input", "Rien à planifier : tes examens sont passés ou tes matières n'ont pas encore de contenu.", 400);
  }

  const { data: plan, error: planError } = await supabase
    .from("study_plans")
    .insert({
      user_id: user.id,
      start_date: today,
      end_date: sessions.at(-1)?.date ?? addDays(today, body.horizonDays - 1),
      daily_minutes: dailyMinutes,
    })
    .select("id")
    .single();
  if (planError) throw planError;

  const { error: insertError } = await supabase.from("study_sessions").insert(
    sessions.map((s) => ({
      user_id: user.id,
      plan_id: plan.id,
      subject_id: s.subjectId,
      topic_id: s.topicId,
      scheduled_date: s.date,
      kind: s.kind,
      title: s.title.slice(0, 200),
      duration_minutes: s.durationMinutes,
      position: s.position,
    })),
  );
  if (insertError) {
    await supabase.from("study_plans").delete().eq("id", plan.id);
    throw insertError;
  }

  // The new plan replaces what was still planned from today (done sessions are kept).
  const { error: deleteError } = await supabase
    .from("study_sessions")
    .delete()
    .eq("status", "planned")
    .gte("scheduled_date", today)
    .or(`plan_id.is.null,plan_id.neq.${plan.id}`);
  if (deleteError) throw deleteError;

  if (body.dailyMinutes && body.dailyMinutes !== profile?.daily_study_minutes) {
    await supabase.from("profiles").update({ daily_study_minutes: body.dailyMinutes }).eq("id", user.id);
  }
  await track(user.id, "study_plan_generated", { days: body.horizonDays, sessions: sessions.length });
  return NextResponse.json({ planId: plan.id, sessions: sessions.length });
});
