import { defineConfig, devices } from '@playwright/test';

// Astro requires Node.js >=22.12.0; point to the Nix-provided Node 22 binary
const NODE22 = '/nix/store/3scj3c1qxh5iclf8jy5hbl9pki40y77n-nodejs-22.19.0/bin';

const testEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  SESSION_SECRET: 'test-session-secret-for-e2e-tests-only',
  SESSION_DURATION: '3600',
  ZITADEL_DOMAIN: 'https://test.zitadel.cloud',
  ZITADEL_CLIENT_ID: 'test-client-id',
  ZITADEL_CLIENT_SECRET: 'test-client-secret',
  ZITADEL_CALLBACK_URL: 'http://localhost:3000/api/auth/callback/zitadel',
  ZITADEL_POST_LOGOUT_URL: 'http://localhost:3000/api/auth/logout/callback',
  ZITADEL_POST_LOGIN_URL: '/profile',
  AUTH_SECRET: 'test-secret-for-e2e-tests-only-32ch',
  PATH: `${NODE22}:${process.env.PATH ?? ''}`,
};

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  testDir: './test',
  outputDir: './build/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    [
      'junit',
      {
        outputFile: './build/reports/junit.xml',
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: testEnv,
  },
});
