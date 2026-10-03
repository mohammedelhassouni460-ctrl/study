import { expect, test } from "@playwright/test";

import { completeOnboarding, signUp, uploadFixture } from "./helpers";

test("generate a structured study sheet and consume credits", async ({ page }) => {
  await signUp(page);
  const subjectId = await completeOnboarding(page, "Microéconomie");
  await uploadFixture(page);

  await page.goto(`/subjects/${subjectId}/summary`);
  await page.getByText("Ultra courte").click();
  await page.getByRole("button", { name: "Générer la fiche" }).click();
  await expect(page.getByText("Fiche générée !")).toBeVisible();

  await expect(page.getByRole("heading", { name: "L'élasticité et les externalités" })).toBeVisible();
  await expect(page.getByText("Ep = (% variation quantité) / (% variation prix)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Formules" })).toBeVisible();

  // 10 credits consumed out of 100
  await expect(page.getByText("90 / 100").first()).toBeVisible();
});
