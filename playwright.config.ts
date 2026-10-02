import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a local Supabase (`npm run db:start`) and the Next.js
 * dev server. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use a preinstalled Chromium.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const MOCK_PORT = 4010;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          // Fake Anthropic + Voyage APIs: AI flows run end-to-end without real keys.
          command: `node tests/mocks/ai-mock-server.mjs`,
          url: `http://127.0.0.1:${MOCK_PORT}/health`,
          reuseExistingServer: true,
          timeout: 20_000,
        },
        {
          command: `npx next dev -p ${PORT}`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: true,
          timeout: 120_000,
          env: {
            NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
            ANTHROPIC_API_KEY: "test-key",
            ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
            VOYAGE_API_KEY: "test-key",
            VOYAGE_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/voyage`,
          },
        },
      ],
});
