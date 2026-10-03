import { expect, test, type Page } from "@playwright/test";

import { completeOnboarding, signUp, uploadFixture } from "./helpers";

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test("app pages fit a phone screen without horizontal scrolling", async ({ page }) => {
  test.setTimeout(120_000);
  await signUp(page);
  const id = await completeOnboarding(page);
  await uploadFixture(page);
  await page.setViewportSize({ width: 360, height: 780 });

  for (const path of [
    "/",
    "/pricing",
    "/dashboard",
    "/subjects",
    `/subjects/${id}`,
    `/subjects/${id}/documents`,
    `/subjects/${id}/summary`,
    `/subjects/${id}/flashcards`,
    `/subjects/${id}/quiz`,
    `/subjects/${id}/chat`,
    "/planner",
    "/settings/profile",
    "/settings/billing",
    "/settings/data",
  ]) {
    await page.goto(path);
    if ((await horizontalOverflow(page)) > 0) {
      console.log(
        path,
        await page.evaluate(() =>
          [...document.querySelectorAll("body *")]
            .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
            .filter((el) => {
              for (let p = el.parentElement; p; p = p.parentElement) {
                const o = getComputedStyle(p).overflowX;
                if (o === "auto" || o === "hidden" || o === "scroll") return false;
              }
              return true;
            })
            .slice(0, 8)
            .map((el) => `${el.tagName}.${(el.getAttribute("class") ?? "").slice(0, 90)} [${(el.textContent ?? "").slice(0, 30)}]`)
            .join("\n"),
        ),
      );
    }
    expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
  }
});
