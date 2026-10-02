import path from "node:path";

import { expect, test } from "@playwright/test";

import { completeOnboarding, signUp } from "./helpers";

const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

test("upload a PDF and a TXT: stored privately, processed, topics detected", async ({ page }) => {
  await signUp(page);
  const subjectId = await completeOnboarding(page, "Microéconomie");

  await page.getByTestId("document-input").setInputFiles([
    fixture("microeconomie-chapitre-2.pdf"),
    fixture("microeconomie-chapitre-2.txt"),
  ]);

  const list = page.getByRole("list").filter({ hasText: "microeconomie-chapitre-2.pdf" }).last();
  await expect(page.getByText("« microeconomie-chapitre-2.txt » est prêt.")).toBeVisible({ timeout: 45_000 });
  await expect(list.getByText("Prêt").first()).toBeVisible();

  // Overview shows detected concepts
  await page.goto(`/subjects/${subjectId}`);
  await expect(page.getByRole("heading", { name: "Concepts" })).toBeVisible();
  await expect(page.getByText("Élasticité-prix de la demande").first()).toBeVisible();
  await expect(page.getByText("Les externalités").first()).toBeVisible();
});

test("rejects unsupported files before upload", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page, "Droit");
  await page.getByTestId("document-input").setInputFiles({
    name: "script.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("MZ..."),
  });
  await expect(page.getByText(/Format non supporté/)).toBeVisible();
});
