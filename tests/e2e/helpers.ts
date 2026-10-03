import path from "node:path";

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

/** Uploads a fixture on the current subject's documents page and waits until it's ready. */
export async function uploadFixture(page: Page, file = "microeconomie-chapitre-2.txt") {
  await page.getByTestId("document-input").setInputFiles(path.join(__dirname, "..", "fixtures", file));
  await expect(page.getByText(`« ${file} » est prêt.`)).toBeVisible({ timeout: 45_000 });
}

/** Local Supabase admin access for tests (reads the demo keys from .env.local). */
function localEnv(): Record<string, string> {
  const fs = require("node:fs") as typeof import("node:fs");
  const file = path.join(__dirname, "..", "..", ".env.local");
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

export async function getUserIdByEmail(email: string): Promise<string> {
  const env = localEnv();
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const json = (await res.json()) as { users: { id: string; email: string }[] };
  const user = json.users.find((u) => u.email === email);
  if (!user) throw new Error(`User ${email} not found`);
  return user.id;
}
