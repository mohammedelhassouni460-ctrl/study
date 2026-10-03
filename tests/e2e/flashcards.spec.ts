import { expect, test } from "@playwright/test";

import { completeOnboarding, signUp, uploadFixture } from "./helpers";

test("generate flashcards, review them with spaced repetition and respect the Free cap", async ({ page }) => {
  await signUp(page);
  const subjectId = await completeOnboarding(page, "Microéconomie");
  await uploadFixture(page);

  await page.goto(`/subjects/${subjectId}/flashcards`);
  await expect(page.getByText("Pas encore de flashcards")).toBeVisible();
  await page.locator("label[for=count-10]").click();
  await page.getByRole("button", { name: "Générer 10 flashcards" }).click();
  await expect(page.getByText("10 flashcards créées !")).toBeVisible();

  // Review session: flip with the keyboard, rate with buttons and shortcuts.
  await expect(page.getByText("Carte 1 / 10")).toBeVisible();
  await expect(page.getByText("Qu'est-ce que l'élasticité-prix de la demande ?")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByText("La variation relative de la demande")).toBeVisible();
  await page.getByRole("button", { name: /Facile/ }).click();
  await expect(page.getByText("Carte 2 / 10")).toBeVisible();

  // "À revoir" puts the card back at the end of the session.
  await page.getByRole("button", { name: "Voir la réponse" }).click();
  await page.keyboard.press("1");
  await expect(page.getByText("Carte 3 / 11")).toBeVisible();

  for (let i = 3; i <= 11; i++) {
    await page.getByRole("button", { name: "Voir la réponse" }).click();
    await page.keyboard.press("3");
  }
  await expect(page.getByText("Session terminée !")).toBeVisible();

  // After a reload nothing is due anymore, and every card is listed.
  await page.reload();
  await expect(page.getByRole("tab", { name: "Réviser (0)" })).toBeVisible();
  await expect(page.getByText("Qu'est-ce que l'élasticité-prix de la demande ?")).toBeVisible();

  // Free plan: 30 cards max; asking for 50 creates only the remaining 20.
  await page.locator("label[for=count-50]").click();
  await page.getByRole("button", { name: "Générer 50 flashcards" }).click();
  await expect(page.getByText("20 flashcards créées !")).toBeVisible();
  await expect(page.getByText("Limite du plan Gratuit atteinte")).toBeVisible();
});
