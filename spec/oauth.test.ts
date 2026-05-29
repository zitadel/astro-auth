import { test, expect, type Page } from '@playwright/test';
import { GenericContainer, Wait } from 'testcontainers';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';

const OAUTH_PORT = 3851;
const BASE_URL = `http://localhost:${OAUTH_PORT}`;
const AUTH_SIGNIN_URL = '/api/auth/signin';

let container: Awaited<
  ReturnType<InstanceType<typeof GenericContainer>['start']>
>;
let devServer: ChildProcess;

test.use({ baseURL: BASE_URL });

/**
 * Drives the full OAuth login flow against the Mock OIDC container.
 *
 * @param page - The Playwright Page instance
 * @returns Resolves once the browser has navigated to /profile
 */
async function signInWithOAuth(page: Page): Promise<void> {
  await page.goto(AUTH_SIGNIN_URL);
  await page.waitForSelector('text=Mock OIDC', { timeout: 15_000 });
  await page.click('text=Mock OIDC');
  await page.waitForSelector('input[name="username"]', { timeout: 15_000 });
  await page.fill('input[name="username"]', 'testuser');
  await page.locator('[type="submit"]').first().click();
  await page.waitForURL(/\/profile/, { timeout: 30_000 });
}

/**
 * Drives the login flow from the home page's client `signIn('mock-oidc')`
 * button. Because the helper performs a CSRF-protected POST straight to
 * `/api/auth/signin/mock-oidc`, the browser lands directly on the Mock OIDC
 * username form — there is no Auth.js provider chooser to click through. This
 * is the path that regressed to the Configuration error before the fix.
 *
 * @param page - The Playwright Page instance
 * @returns Resolves once the browser has navigated to /profile
 */
async function signInWithClientHelper(page: Page): Promise<void> {
  // Wait for hydration: the button calls the client `signIn` helper, so its
  // click handler is only wired once the page's JavaScript has loaded.
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.click('[data-testid="signin-oauth"]');
  await page.waitForSelector('input[name="username"]', { timeout: 30_000 });
  await page.fill('input[name="username"]', 'testuser');
  await page.locator('[type="submit"]').first().click();
  await page.waitForURL(/\/profile/, { timeout: 30_000 });
}

test.beforeAll(
  async () => {
    container = await new GenericContainer(
      'ghcr.io/navikt/mock-oauth2-server:2.1.10',
    )
      .withEnvironment({
        JSON_CONFIG: JSON.stringify({ interactiveLogin: true }),
      })
      .withExposedPorts(8080)
      .withWaitStrategy(
        Wait.forHttp('/default/.well-known/openid-configuration', 8080),
      )
      .start();

    const issuerUrl = `http://${container.getHost()}:${container.getMappedPort(8080)}/default`;
    const playgroundDir = path.resolve(import.meta.dirname, '../playground');

    devServer = spawn('npm', ['run', 'dev'], {
      cwd: playgroundDir,
      env: {
        ...process.env,
        AUTH_SECRET: 'test-secret-for-e2e-testing-only-32ch',
        AUTH_URL: `http://localhost:${OAUTH_PORT}`,
        PORT: String(OAUTH_PORT),
        OAUTH_ISSUER_URL: issuerUrl,
        OAUTH_CLIENT_ID: 'test-client',
        OAUTH_CLIENT_SECRET: 'test-secret',
      },
      detached: true,
      shell: true,
      stdio: 'pipe',
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Dev server startup timeout')),
        120_000,
      );
      const check = async () => {
        try {
          const res = await fetch(`${BASE_URL}/`);
          if (res.ok || res.status < 500) {
            clearTimeout(timeout);
            resolve();
            return;
          }
        } catch {
          // Server not ready yet.
        }
        setTimeout(check, 1000);
      };
      devServer.on('error', reject);
      setTimeout(check, 3000);
    });
  },
  { timeout: 120_000 },
);

test.afterAll(async () => {
  if (devServer.pid != null) process.kill(-devServer.pid, 'SIGTERM');
  await container.stop();
});

test('homepage shows unauthenticated state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="signin-oauth"]')).toBeVisible();
  await expect(page.locator('[data-testid="signin-default"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="signin-credentials"]'),
  ).toBeVisible();
});

// Side path: the home page's client `signIn('mock-oidc')` button. This
// exercises the SDK client helper end-to-end — the path that previously threw
// a Configuration error because the helper issued a GET instead of a POST.
test('OAuth sign-in via home client-helper button', async ({ page }) => {
  await signInWithClientHelper(page);
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.locator('[data-testid="signout-button"]')).toBeVisible();
});

// Direct route: the Auth.js-rendered provider chooser at /api/auth/signin.
test('full OAuth flow via Auth.js sign-in page', async ({ page }) => {
  await signInWithOAuth(page);
  await expect(page).toHaveURL(/\/profile/);
});

// Logout component: the one-click client `signOut()` button on the profile
// page clears the session and returns to the unauthenticated home page.
test('sign-out via logout component', async ({ page }) => {
  await signInWithClientHelper(page);
  // Wait for hydration so the one-click signOut handler is wired.
  await page.waitForLoadState('networkidle');
  await page.click('[data-testid="signout-button"]');
  // signOut clears the session, so the protected profile page is no longer
  // reachable (the app bounces unauthenticated users away from it).
  await page.waitForURL((url) => !url.pathname.startsWith('/profile'), {
    timeout: 30_000,
  });
  await page.goto('/');
  await expect(
    page.locator('[data-testid="signin-credentials"]'),
  ).toBeVisible();
});
