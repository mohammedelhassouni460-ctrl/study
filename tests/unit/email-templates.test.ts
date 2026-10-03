import { describe, expect, it } from "vitest";

import { studyReminderEmail, weeklyReportEmail } from "@/lib/email/templates";

describe("studyReminderEmail", () => {
  const email = studyReminderEmail({
    name: "Camille",
    appUrl: "https://studyos.test",
    sessions: [
      { title: "Flashcards — Microéconomie", subjectName: "Microéconomie", durationMinutes: 15 },
      { title: "QCM — <script>alert(1)</script>", subjectName: "Éco", durationMinutes: 20 },
    ],
  });

  it("summarises the day in the subject", () => {
    expect(email.subject).toBe("Ta session du jour : 2 activités, 35 min");
  });

  it("escapes user content in the HTML", () => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("links to the planner and to notification settings", () => {
    expect(email.html).toContain("https://studyos.test/planner");
    expect(email.text).toContain("https://studyos.test/settings/notifications");
  });
});

describe("weeklyReportEmail", () => {
  it("reports activity, weak topics and the next exam", () => {
    const email = weeklyReportEmail({
      name: null,
      appUrl: "https://studyos.test",
      stats: {
        quizzes: 2,
        averageScore: 65,
        flashcardsReviewed: 40,
        sessionsDone: 3,
        globalMastery: 52,
        weakTopics: [{ name: "Externalités", subjectName: "Microéconomie", mastery: 28 }],
        nextExam: { subjectName: "Microéconomie", daysLeft: 1 },
      },
    });
    expect(email.subject).toBe("Ton bilan de la semaine : 52 % de maîtrise");
    expect(email.text).toContain("2 quiz (moyenne 65 %)");
    expect(email.text).toContain("Externalités (28 %)");
    expect(email.html).toContain("dans 1 jour.");
  });
});
