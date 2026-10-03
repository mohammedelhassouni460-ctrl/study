import { expect, test } from "@playwright/test";

import { completeOnboarding, signUp, uploadFixture } from "./helpers";

test("generate a quiz, answer it, get a server-side score and updated mastery", async ({ page }) => {
  await signUp(page);
  const subjectId = await completeOnboarding(page, "Microéconomie");
  await uploadFixture(page);

  await page.goto(`/subjects/${subjectId}/quiz`);
  await page.locator("label[for=quiz-count-5]").click();
  await page.getByRole("button", { name: "Générer le quiz" }).click();
  await expect(page).toHaveURL(/\/quiz\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Question 1 / 5")).toBeVisible();

  // The correction is never sent to the browser before submission.
  expect(await page.content()).not.toContain("Ep = -20 / 10");

  await page.getByText("-2", { exact: true }).click(); // Q1 correct
  await page.getByRole("button", { name: "Suivante" }).click();
  await page.getByText("Proposition A").click(); // Q2 wrong (B)
  await page.getByRole("button", { name: "Suivante" }).click();
  await page.keyboard.press("3"); // Q3 correct (C)
  await page.getByRole("button", { name: "Suivante" }).click();
  await page.getByRole("button", { name: "Suivante" }).click(); // Q4 skipped
  await page.keyboard.press("a"); // Q5 correct (A)

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Valider le quiz" }).click();

  await expect(page).toHaveURL(/\?attempt=/);
  await expect(page.getByTestId("quiz-score")).toHaveText("3 / 5");
  await expect(page.getByText("60 %")).toBeVisible();
  await expect(page.getByText("12 / 20")).toBeVisible();
  await expect(page.getByText("Ep = -20 / 10 = -2. La demande est donc élastique.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Concepts à retravailler" })).toBeVisible();
  await expect(page.getByText("Élasticité-revenu").first()).toBeVisible();

  // Mastery has moved on the subject overview.
  await page.goto(`/subjects/${subjectId}`);
  await expect(page.getByText("Élasticité-prix de la demande").first()).toBeVisible();

  // History shows the score; the Free plan allows 3 quizzes per week.
  await page.goto(`/subjects/${subjectId}/quiz`);
  await expect(page.getByText("60 %")).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.goto(`/subjects/${subjectId}/quiz`);
    await page.locator("label[for=quiz-count-5]").click();
    await page.getByRole("button", { name: "Générer le quiz" }).click();
    await expect(page.getByText("Question 1 / 5")).toBeVisible();
  }
  await page.goto(`/subjects/${subjectId}/quiz`);
  await page.getByRole("button", { name: "Générer le quiz" }).click();
  await expect(page.getByText(/limite de 3 quiz par semaine/)).toBeVisible();
  await expect(page.getByText("70 / 100").first()).toBeVisible();
});
