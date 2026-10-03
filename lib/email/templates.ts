/** Plain, inline-styled transactional emails (pure functions, unit tested). */

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout(appUrl: string, title: string, body: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:18px;font-weight:bold;color:#4f46e5;padding-bottom:16px">StudyOS AI</td></tr>
<tr><td><h1 style="font-size:20px;margin:0 0 12px">${escape(title)}</h1>${body}</td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#71717a">Tu reçois cet email car tu l'as activé dans StudyOS.
<a href="${appUrl}/settings/notifications" style="color:#71717a">Gérer mes notifications</a></td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;font-weight:bold">${escape(label)}</a></p>`;

export interface ReminderSession {
  title: string;
  subjectName: string;
  durationMinutes: number;
}

export function studyReminderEmail(opts: { name: string | null; appUrl: string; sessions: ReminderSession[] }) {
  const total = opts.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const hello = opts.name ? `Bonjour ${opts.name},` : "Bonjour,";
  const subject = `Ta session du jour : ${opts.sessions.length} activité${opts.sessions.length > 1 ? "s" : ""}, ${total} min`;
  const items = opts.sessions
    .map((s) => `<li style="margin:4px 0">${escape(s.title)} <span style="color:#71717a">· ${escape(s.subjectName)} · ${s.durationMinutes} min</span></li>`)
    .join("");
  const html = layout(
    opts.appUrl,
    "Ta session de révision t'attend",
    `<p>${escape(hello)}</p><p>Voici ce que ton planning prévoit aujourd'hui :</p><ul style="padding-left:20px">${items}</ul>${button(`${opts.appUrl}/planner`, "Commencer ma session")}`,
  );
  const text = `${hello}\n\nTon planning prévoit aujourd'hui :\n${opts.sessions
    .map((s) => `- ${s.title} (${s.subjectName}, ${s.durationMinutes} min)`)
    .join("\n")}\n\nCommencer : ${opts.appUrl}/planner\n\nGérer mes notifications : ${opts.appUrl}/settings/notifications`;
  return { subject, html, text };
}

export interface WeeklyStats {
  quizzes: number;
  averageScore: number | null;
  flashcardsReviewed: number;
  sessionsDone: number;
  globalMastery: number;
  weakTopics: { name: string; subjectName: string; mastery: number }[];
  nextExam: { subjectName: string; daysLeft: number } | null;
}

export function weeklyReportEmail(opts: { name: string | null; appUrl: string; stats: WeeklyStats }) {
  const s = opts.stats;
  const hello = opts.name ? `Bonjour ${opts.name},` : "Bonjour,";
  const subject = `Ton bilan de la semaine : ${s.globalMastery} % de maîtrise`;
  const lines = [
    `${s.quizzes} quiz${s.averageScore !== null ? ` (moyenne ${s.averageScore} %)` : ""}`,
    `${s.flashcardsReviewed} flashcards révisées`,
    `${s.sessionsDone} sessions du planning terminées`,
    `Maîtrise globale : ${s.globalMastery} %`,
  ];
  const weak = s.weakTopics.length
    ? `<p style="margin-top:16px"><strong>À retravailler cette semaine :</strong></p><ul style="padding-left:20px">${s.weakTopics
        .map((t) => `<li>${escape(t.name)} <span style="color:#71717a">· ${escape(t.subjectName)} · ${t.mastery} %</span></li>`)
        .join("")}</ul>`
    : "";
  const exam = s.nextExam
    ? `<p>Ton examen de <strong>${escape(s.nextExam.subjectName)}</strong> est dans ${s.nextExam.daysLeft} jour${s.nextExam.daysLeft > 1 ? "s" : ""}.</p>`
    : "";
  const html = layout(
    opts.appUrl,
    "Ton bilan de la semaine",
    `<p>${escape(hello)}</p>${exam}<ul style="padding-left:20px">${lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul>${weak}${button(`${opts.appUrl}/dashboard`, "Voir ma progression")}`,
  );
  const text = `${hello}\n\n${s.nextExam ? `Examen de ${s.nextExam.subjectName} dans ${s.nextExam.daysLeft} jours.\n\n` : ""}${lines
    .map((l) => `- ${l}`)
    .join("\n")}${
    s.weakTopics.length ? `\n\nÀ retravailler : ${s.weakTopics.map((t) => `${t.name} (${t.mastery} %)`).join(", ")}` : ""
  }\n\nVoir ma progression : ${opts.appUrl}/dashboard\n\nGérer mes notifications : ${opts.appUrl}/settings/notifications`;
  return { subject, html, text };
}
