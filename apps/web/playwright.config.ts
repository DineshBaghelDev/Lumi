import { defineConfig } from "@playwright/test";

const mockApiUrl = process.env.LUMI_E2E_MOCK_API_URL ?? "http://127.0.0.1:3107";
const baseURL = process.env.BASE_URL ?? "http://localhost:3108";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.BASE_URL
    ? [
        {
          command: "node e2e/mock-api.mjs",
          url: `${mockApiUrl}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      ]
    : [
        {
          command: "node e2e/mock-api.mjs",
          url: `${mockApiUrl}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command: "pnpm exec next dev -p 3108",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            NEXT_PUBLIC_API_BASE_URL: mockApiUrl,
            NEXT_PUBLIC_INSFORGE_URL: "http://127.0.0.1:3999",
            NEXT_PUBLIC_INSFORGE_ANON_KEY: "e2e-anon-key",
            LUMI_E2E_SKIP_AUTH: "1",
          },
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
