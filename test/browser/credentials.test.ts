import { test, expect, type Page } from '@playwright/test';

const AUTH_SIGNIN_URL = '/api/auth/signin';
const AUTH_SIGNOUT_URL = '/api/auth/signout';

async function signInWithCredentials(page: Page): Promise<void> {
  await page.goto(AUTH_SIGNIN_URL);
  await page.waitForSelector('input[name="username"]', { timeout: 10_000 });
  await page.fill('input[name="username"]', 'jsmith');
  await page.fill('input[name="password"]', 'hunter2');
  await page
    .locator('form:has(input[name="username"]) button[type="submit"]')
    .click();
  await page.waitForURL(/\/profile/, { timeout: 15_000 });
}

async function signOutUser(page: Page): Promise<void> {
  await page.click('[data-testid="signout-button"]');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/api/auth/'), {
    timeout: 10_000,
  });
}

test.describe('Unauthenticated state', () => {
  test('homepage is accessible', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('protected /profile redirects to sign-in', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/auth\/login|\/api\/auth\/signin/);
  });

  test('sign-in button is visible on homepage', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('[data-testid="signin-credentials"]'),
    ).toBeVisible();
  });
});

test.describe('Credentials sign-in flow', () => {
  test('clicking signin-credentials navigates to Auth.js sign-in page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.click('[data-testid="signin-credentials"]');
    await expect(page).toHaveURL(/\/api\/auth\/signin/);
  });

  test('valid credentials complete sign-in and reach profile', async ({
    page,
  }) => {
    await signInWithCredentials(page);
    await expect(page).toHaveURL(/\/profile/);
  });

  test('signout-button is visible after sign-in', async ({ page }) => {
    await signInWithCredentials(page);
    await page.goto('/');
    await expect(page.locator('[data-testid="signout-button"]')).toBeVisible();
  });

  test('clicking signout-button ends session', async ({ page }) => {
    await signInWithCredentials(page);
    await page.goto('/');
    await signOutUser(page);
    await expect(
      page.locator('[data-testid="signin-credentials"]'),
    ).toBeVisible();
  });
});

test.describe('Invalid credentials', () => {
  test('wrong password stays on sign-in or error page', async ({ page }) => {
    await page.goto(AUTH_SIGNIN_URL);
    await page.waitForSelector('input[name="username"]', { timeout: 10_000 });
    await page.fill('input[name="username"]', 'jsmith');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page
      .locator('form:has(input[name="username"]) button[type="submit"]')
      .click();
    await expect(page).toHaveURL(/\/api\/auth\/signin|\/auth\/error/);
  });

  test('wrong password does not create a session', async ({ page }) => {
    await page.goto(AUTH_SIGNIN_URL);
    await page.waitForSelector('input[name="username"]', { timeout: 10_000 });
    await page.fill('input[name="username"]', 'jsmith');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page
      .locator('form:has(input[name="username"]) button[type="submit"]')
      .click();
    await page.waitForURL(/\/api\/auth\/signin|\/auth\/error/, { timeout: 15_000 });
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/auth\/login|\/api\/auth\/signin/);
  });
});

test.describe('Open redirect prevention', () => {
  test('sign-in with external callbackUrl does not redirect externally', async ({
    page,
  }) => {
    await page.goto(`${AUTH_SIGNIN_URL}?callbackUrl=https://evil.example.com`);
    await page.waitForSelector('input[name="username"]', {
      timeout: 10_000,
    });
    await page.fill('input[name="username"]', 'jsmith');
    await page.fill('input[name="password"]', 'hunter2');
    await page
      .locator('form:has(input[name="username"]) button[type="submit"]')
      .click();
    await page.waitForURL(/\/profile/, { timeout: 15_000 });
    expect(page.url()).not.toContain('evil.example.com');
  });

  test('sign-out with external callbackUrl does not redirect externally', async ({
    page,
  }) => {
    await signInWithCredentials(page);
    await page.goto(`${AUTH_SIGNOUT_URL}?callbackUrl=https://evil.example.com`);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(
      (url) => !url.pathname.startsWith('/api/auth/signout'),
      { timeout: 10_000 },
    );
    expect(page.url()).not.toContain('evil.example.com');
  });
});

test.describe('Logout callback cookie clearing', () => {
  test('GET /api/auth/logout/callback clears authjs cookies', async ({
    page,
    context,
  }) => {
    await signInWithCredentials(page);
    const cookiesBefore = await context.cookies();
    const authjsCookies = cookiesBefore.filter((c) =>
      c.name.startsWith('authjs.'),
    );
    expect(authjsCookies.length).toBeGreaterThan(0);

    await page.goto('/api/auth/logout/callback');

    const cookiesAfter = await context.cookies();
    const remainingAuthjs = cookiesAfter.filter((c) =>
      c.name.startsWith('authjs.'),
    );
    expect(remainingAuthjs.length).toBe(0);
  });
});
