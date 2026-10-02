import { expect, test } from "@playwright/test";

import { completeOnboarding, signUp, uploadFixture } from "./helpers";

test("generate a study plan, complete and move sessions", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page, "Microéconomie");
  await uploadFixture(page);

  await page.goto("/planner");
  await expect(page.getByText("Pas encore de planning")).toBeVisible();
  await page.getByLabel("Minutes par jour").fill("60");
  await page.getByRole("button", { name: "Générer mon planning" }).click();
  await expect(page.getByText(/Planning prêt : \d+ sessions planifiées/)).toBeVisible();

  const todaySection = page.locator("section", { has: page.getByRole("heading", { name: /^Aujourd'hui/ }) });
  await expect(todaySection).toBeVisible();
  await expect(todaySection.getByText("0/", { exact: false })).toContainText("60 min");
  await expect(page.getByText("Examen : Microéconomie")).toBeVisible();

  // Complete the first session of the day.
  await todaySection.getByRole("button", { name: /comme terminée/ }).first().click();
  await expect(page.getByText("Session terminée, bravo !")).toBeVisible();
  await expect(todaySection.getByText(/^1\/\d+ faites/)).toBeVisible();

  // Postpone another one to tomorrow.
  await todaySection.getByRole("button", { name: /^Options de/ }).last().click();
  await page.getByRole("menuitem", { name: "Reporter à demain" }).click();
  await expect(page.getByText("Session reportée à demain")).toBeVisible();

  // The dashboard follows the saved plan.
  await page.goto("/dashboard");
  await expect(page.getByText(/Session recommandée/)).toBeVisible();
});
