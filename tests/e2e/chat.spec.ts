import { expect, test } from "@playwright/test";

import { completeOnboarding, signUp, uploadFixture } from "./helpers";

test("ask a question about the course and get a streamed, sourced answer", async ({ page }) => {
  await signUp(page);
  const subjectId = await completeOnboarding(page, "Microéconomie");
  await uploadFixture(page);

  const question = "Qu'est-ce que l'élasticité-prix de la demande ?";
  await page.goto(`/subjects/${subjectId}/chat?prompt=${encodeURIComponent(question)}`);
  const input = page.getByLabel("Ta question");
  await expect(input).toHaveValue(question);
  await input.press("Enter");

  await expect(page.getByText("D'après ton cours, l'élasticité-prix de la demande mesure")).toBeVisible();
  await expect(page.getByText(/source(s)? dans tes documents/)).toBeVisible();
  await page.getByRole("button", { name: "Source 1" }).first().click();
  await expect(page.getByText(/\[1\] microeconomie-chapitre-2/)).toBeVisible();

  // One chat message = 1 credit.
  await expect(page.getByText("99 / 100").first()).toBeVisible();

  // The conversation is persisted.
  await page.goto(`/subjects/${subjectId}/chat`);
  await expect(page.getByText(question)).toBeVisible();
  await expect(page.getByText("D'après ton cours")).toBeVisible();

  await page.getByRole("button", { name: "Effacer" }).click();
  await expect(page.getByText("Pose une question sur ton cours")).toBeVisible();
});
