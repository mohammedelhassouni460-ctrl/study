import { expect, test } from "@playwright/test";

import { PASSWORD, completeOnboarding, signUp } from "./helpers";

test("signup → onboarding → dashboard, then logout and login again", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page, "Statistiques");

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Bonjour Camille/ })).toBeVisible();
  await expect(page.getByText("Statistiques").first()).toBeVisible();

  // Logout
  await page.getByRole("button", { name: "Menu du compte" }).first().click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL("/");

  // Private pages are protected
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

  // Login brings the user back where they wanted to go
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("wrong password shows a friendly error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@studyos.test");
  await page.getByLabel("Mot de passe").fill("wrong-password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
});
