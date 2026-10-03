import { expect, test } from "@playwright/test";
import Stripe from "stripe";

import { E2E_STRIPE_WEBHOOK_SECRET } from "../../playwright.config";
import { completeOnboarding, getUserIdByEmail, signUp } from "./helpers";

const stripe = new Stripe("sk_test_e2e_not_a_real_key");

function subscriptionEvent(type: string, userId: string, status: string) {
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86_400;
  return JSON.stringify({
    id: `evt_${Date.now()}`,
    object: "event",
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `sub_e2e_${userId.slice(0, 8)}`,
        object: "subscription",
        customer: `cus_e2e_${userId.slice(0, 8)}`,
        status,
        cancel_at_period_end: false,
        cancel_at: null,
        metadata: { user_id: userId },
        items: { object: "list", data: [{ id: "si_e2e", current_period_end: periodEnd, price: { id: "price_e2e_monthly" } }] },
      },
    },
  });
}

test("Stripe webhooks grant and revoke Pro; bad signatures are rejected", async ({ page, request }) => {
  const email = await signUp(page);
  await completeOnboarding(page);
  const userId = await getUserIdByEmail(email);

  await page.goto("/settings/billing");
  await expect(page.getByTestId("current-plan")).toHaveText("Gratuit");
  await expect(page.getByText("0 / 100").first()).toBeVisible();

  const payload = subscriptionEvent("customer.subscription.created", userId, "active");

  // Unsigned or wrongly signed events are refused.
  const forged = await request.post("/api/stripe/webhook", {
    data: payload,
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
  });
  expect(forged.status()).toBe(400);

  const signed = await request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: E2E_STRIPE_WEBHOOK_SECRET }),
    },
  });
  expect(signed.status()).toBe(200);

  await page.reload();
  await expect(page.getByTestId("current-plan")).toHaveText("Pro");
  await expect(page.getByText(/0 \/ 5\s?000/).first()).toBeVisible();
  await expect(page.getByText(/Prochain renouvellement le/)).toBeVisible();

  // Pro users cannot delete their account before cancelling.
  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByLabel(/pour confirmer/).fill("SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page.getByText(/Résilie d'abord ton abonnement Pro/)).toBeVisible();

  // Cancellation brings the user back to the Free plan.
  const deleted = subscriptionEvent("customer.subscription.deleted", userId, "canceled");
  const res = await request.post("/api/stripe/webhook", {
    data: deleted,
    headers: {
      "content-type": "application/json",
      "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload: deleted, secret: E2E_STRIPE_WEBHOOK_SECRET }),
    },
  });
  expect(res.status()).toBe(200);
  await page.goto("/settings/billing");
  await expect(page.getByTestId("current-plan")).toHaveText("Gratuit");
});

test("pricing page shows both plans to visitors", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Des tarifs simples" })).toBeVisible();
  await expect(page.getByText(/9,99\s€/).first()).toBeVisible();
  await page.getByRole("button", { name: /Annuel/ }).click();
  await expect(page.getByText(/Facturé 79,99\s€ par an/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Passer à Pro" })).toHaveAttribute("href", "/signup?plan=pro");
});
