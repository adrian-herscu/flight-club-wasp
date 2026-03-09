import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: isCI
    ? {
        command: "npx run-wasp-app dev --path-to-app=../app --wasp-cli-cmd=wasp",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 10 * 60 * 1000,
      }
    : {
        command: "bash ./start-local-e2e.sh",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 10 * 60 * 1000,
      },
});
