import { expect, test } from "@playwright/test";

import { completeOnboarding, signUp } from "./helpers";

test("create, edit and delete a subject; free plan limit", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page, "Microéconomie");

  await page.goto("/subjects");
  await page.getByRole("button", { name: "Nouvelle matière" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom de la matière").fill("Comptabilité");
  await dialog.getByLabel("Note cible (/20)").fill("14");
  await dialog.getByRole("button", { name: "Créer la matière" }).click();
  await expect(page).toHaveURL(/\/subjects\/[0-9a-f-]+\/documents/);
  await expect(page.getByRole("heading", { name: "Comptabilité", level: 1 })).toBeVisible();

  // Free plan: 2 subjects max
  await page.goto("/subjects");
  await expect(page.getByText(/limité à 2 matières/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Nouvelle matière" })).toHaveCount(0);

  // Edit
  await page.getByRole("link", { name: /Comptabilité/ }).click();
  await page.getByRole("button", { name: "Actions de la matière" }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await page.getByRole("dialog").getByLabel("Nom de la matière").fill("Comptabilité générale");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Comptabilité générale", level: 1 })).toBeVisible();

  // Delete
  await page.getByRole("button", { name: "Actions de la matière" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/subjects$/);
  await expect(page.getByText("Comptabilité générale")).toHaveCount(0);
});
