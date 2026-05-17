import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  outputDir: './build/playwright',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'build/playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'devbox run npm run dev',
    cwd: './playground',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_SECRET: 'test-secret-for-e2e-testing-only-32ch',
      PORT: '3000',
    },
    timeout: 120_000,
  },
});
