import { expect, test } from "@playwright/test";

import { E2E_CRON_SECRET, MOCK_URL } from "../../playwright.config";
import { completeOnboarding, signUp, uploadFixture } from "./helpers";

const auth = { authorization: `Bearer ${E2E_CRON_SECRET}` };

async function sentTo(email: string) {
  const res = await fetch(`${MOCK_URL}/resend/_sent?to=${encodeURIComponent(email)}`);
  return (await res.json()) as { subject: string; text: string }[];
}

test("daily reminder and weekly report are sent once per period", async ({ page, request }) => {
  const email = await signUp(page);
  await completeOnboarding(page);
  await uploadFixture(page);
  await page.goto("/planner");
  await page.getByRole("button", { name: "Générer mon planning" }).click();
  await expect(page.getByText(/Planning prêt/)).toBeVisible();

  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  expect((await request.get("/api/cron/reminders", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);

  expect((await request.get("/api/cron/reminders", { headers: auth })).status()).toBe(200);
  let mails = await sentTo(email);
  expect(mails).toHaveLength(1);
  expect(mails[0].subject).toMatch(/^Ta session du jour : \d+ activités?, \d+ min$/);
  expect(mails[0].text).toContain("/planner");

  // Running the job again the same day does not send a duplicate.
  await request.get("/api/cron/reminders", { headers: auth });
  expect(await sentTo(email)).toHaveLength(1);

  const weekly = await request.get("/api/cron/weekly-report", { headers: auth });
  expect(weekly.status()).toBe(200);
  mails = await sentTo(email);
  expect(mails.map((m) => m.subject)).toContainEqual(expect.stringMatching(/^Ton bilan de la semaine/));
});
