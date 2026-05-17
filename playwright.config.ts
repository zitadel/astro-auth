import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  outputDir: './build/playwright',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 240_000,
  reporter: [
    ['html', { outputFolder: 'build/playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3850',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    cwd: './playground',
    url: 'http://localhost:3850',
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_SECRET: 'test-secret-for-e2e-testing-only-32ch',
      AUTH_URL: 'http://localhost:3850',
      PORT: '3850',
    },
    timeout: 120_000,
  },
});
