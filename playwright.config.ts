import { defineConfig, devices } from '@playwright/test';

declare const process: { env: { CI?: string } };

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run sequentially for reliable database state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker avoids database collisions with isolated test items
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Dedicated E2E backend and frontend processes with explicit readiness probes */
  
webServer: [
  {
    command: 'npm run dev:e2e --prefix server',
    url: 'http://localhost:5000/api/v1/health',
    reuseExistingServer: false,
    timeout: 45000,
  },
  {
    command: 'npm run dev --prefix client',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 45000,
  },
],
});
