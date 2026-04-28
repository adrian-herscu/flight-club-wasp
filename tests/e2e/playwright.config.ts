import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: '../../out/test-results',
  fullyParallel: false,
  workers: 8,
  globalSetup: './global-setup.ts',
  
  use: {
    /* Wasp frontend defaults to port 3000 */
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    //{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});