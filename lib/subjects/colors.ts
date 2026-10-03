import { SUBJECT_COLORS, type SubjectColor } from "@/lib/validations/subject";

/** Static class names (Tailwind needs literal strings). */
export const SUBJECT_COLOR_CLASSES: Record<SubjectColor, { dot: string; soft: string; bar: string }> = {
  indigo: { dot: "bg-indigo-500", soft: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", bar: "bg-indigo-500" },
  violet: { dot: "bg-violet-500", soft: "bg-violet-500/10 text-violet-600 dark:text-violet-300", bar: "bg-violet-500" },
  sky: { dot: "bg-sky-500", soft: "bg-sky-500/10 text-sky-600 dark:text-sky-300", bar: "bg-sky-500" },
  emerald: { dot: "bg-emerald-500", soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500" },
  amber: { dot: "bg-amber-500", soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300", bar: "bg-amber-500" },
  rose: { dot: "bg-rose-500", soft: "bg-rose-500/10 text-rose-600 dark:text-rose-300", bar: "bg-rose-500" },
  slate: { dot: "bg-slate-500", soft: "bg-slate-500/10 text-slate-600 dark:text-slate-300", bar: "bg-slate-500" },
};

export const SUBJECT_COLOR_LABELS: Record<SubjectColor, string> = {
  indigo: "Indigo",
  violet: "Violet",
  sky: "Ciel",
  emerald: "Émeraude",
  amber: "Ambre",
  rose: "Rose",
  slate: "Ardoise",
};

export function isSubjectColor(value: unknown): value is SubjectColor {
  return typeof value === "string" && (SUBJECT_COLORS as readonly string[]).includes(value);
}

export function subjectColor(color: string | null | undefined) {
  return SUBJECT_COLOR_CLASSES[isSubjectColor(color) ? color : "indigo"];
}
