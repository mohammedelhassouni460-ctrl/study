import { expect, test } from "@playwright/test";

import { completeOnboarding, PASSWORD, signUp } from "./helpers";

test("update profile and notifications, export data, delete the account", async ({ page }) => {
  const email = await signUp(page);
  await completeOnboarding(page);

  await page.goto("/settings/profile");
  await page.getByLabel("Prénom").fill("Camille R.");
  await page.getByLabel("Temps de révision par jour (min)").fill("90");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Profil mis à jour.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Temps de révision par jour (min)")).toHaveValue("90");

  await page.goto("/settings/notifications");
  await page.getByRole("switch", { name: "Nouveautés StudyOS" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Préférences enregistrées.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: "Nouveautés StudyOS" })).toBeChecked();

  await page.goto("/settings/data");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Télécharger mes données" }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString("utf8")));
  expect(exported.account.email).toBe(email);
  expect(exported.subjects).toHaveLength(1);

  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel(/pour confirmer/).fill("SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page).toHaveURL(/compte=supprime/);

  // The account no longer exists.
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(/incorrect/i)).toBeVisible();
});
