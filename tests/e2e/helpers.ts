import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@studyos.test`;
}

export const PASSWORD = "motdepasse-e2e-123";

/** Signs up a new user (local Supabase has email confirmation disabled) and lands on onboarding. */
export async function signUp(page: Page, email = uniqueEmail(), name = "Camille") {
  await page.goto("/signup");
  await page.getByLabel("Prénom").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  return email;
}

/** Completes onboarding and returns the created subject id. */
export async function completeOnboarding(page: Page, subjectName = "Microéconomie") {
  await page.getByRole("button", { name: "Continuer" }).click(); // name prefilled from signup
  await page.getByRole("radio", { name: "Licence" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: /Préparer mes examens/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  const inThreeWeeks = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Date de l'examen").fill(inThreeWeeks);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Nom de la matière").fill(subjectName);
  await page.getByRole("button", { name: "Créer ma matière" }).click();
  await expect(page).toHaveURL(/\/subjects\/[0-9a-f-]+\/documents/);
  const match = page.url().match(/subjects\/([0-9a-f-]+)\//);
  return match![1];
}
