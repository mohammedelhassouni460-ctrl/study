import { expect, test } from "@playwright/test";

test("landing page renders its key sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tes cours. Ton plan.");
  await expect(page.getByRole("heading", { name: "Tout ce qu'il faut pour réussir tes examens" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comment ça marche" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions fréquentes" })).toBeVisible();
  await page.getByRole("button", { name: "Mes cours restent-ils privés ?" }).click();
  await expect(page.getByText(/ne servent pas à entraîner/)).toBeVisible();
  await page.getByRole("link", { name: "Commencer gratuitement" }).first().click();
  await expect(page).toHaveURL(/\/signup/);
});

test("legal pages, SEO files and 404", async ({ page, request }) => {
  for (const [path, title] of [
    ["/privacy", "Politique de confidentialité"],
    ["/terms", "Conditions générales d'utilisation"],
    ["/cookies", "Politique cookies"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("Document modèle, à vérifier juridiquement.")).toBeVisible();
  }
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /dashboard");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/pricing");

  const headers = (await request.get("/")).headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");

  await page.goto("/cette-page-n-existe-pas");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});

test("private pages redirect visitors to login", async ({ page }) => {
  await page.goto("/planner");
  await expect(page).toHaveURL(/\/login\?next=%2Fplanner/);
});
