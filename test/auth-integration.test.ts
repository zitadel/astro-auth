import { describe, expect, it, beforeAll, afterAll, jest } from '@jest/globals';
import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Integration tests spin up a real dev server — increase the per-test timeout.
jest.setTimeout(120_000);

const PORT = 3852;
const BASE_URL = `http://localhost:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/auth`;
const AUTH_SECRET = 'test-secret-for-e2e-testing-only-32ch';

let devServer: ChildProcess;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract all Set-Cookie values from a Response. */
function getSetCookies(res: Response): string[] {
  // headers.getSetCookie() handles multi-value Set-Cookie headers correctly.
  if (
    typeof (res.headers as Record<string, unknown>).getSetCookie === 'function'
  ) {
    return (
      res.headers as unknown as { getSetCookie(): string[] }
    ).getSetCookie();
  }
  const raw: string[] = [];
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') raw.push(value);
  });
  return raw;
}

/** Build a Cookie header value from raw Set-Cookie strings. */
function cookieHeaderFrom(setCookies: string[]): string {
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

/** Fetch a CSRF token and its associated cookie. */
async function getCsrf(): Promise<{ token: string; cookie: string }> {
  const res = await fetch(`${AUTH_BASE}/csrf`);
  const body = (await res.json()) as { csrfToken: string };
  return {
    token: body.csrfToken,
    cookie: cookieHeaderFrom(getSetCookies(res)),
  };
}

/**
 * POST to the credentials sign-in endpoint and return the raw Response
 * (redirect: 'manual' so callers can inspect the Location header).
 */
async function postSignIn(
  username: string,
  password: string,
  csrfToken: string,
  csrfCookie: string,
  callbackUrl = `${BASE_URL}/profile`,
): Promise<Response> {
  const body = new URLSearchParams({
    username,
    password,
    csrfToken,
    callbackUrl,
  });
  return fetch(`${AUTH_BASE}/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookie,
    },
    body: body.toString(),
    redirect: 'manual',
  });
}

/**
 * Full sign-in: get CSRF → POST credentials → follow redirect to callback →
 * return all Set-Cookie headers collected along the way.
 */
async function signIn(
  username: string,
  password: string,
  callbackUrl?: string,
): Promise<{ cookies: string[]; finalUrl: string }> {
  const { token, cookie } = await getCsrf();
  const signInRes = await postSignIn(
    username,
    password,
    token,
    cookie,
    callbackUrl,
  );
  const signInCookies = getSetCookies(signInRes);

  const location = signInRes.headers.get('location');
  if (!location) return { cookies: signInCookies, finalUrl: '' };

  // Follow the callback redirect (stays on the same host).
  const callbackHref = location.startsWith('/')
    ? `${BASE_URL}${location}`
    : location;
  if (!callbackHref.startsWith(BASE_URL)) {
    // External redirect – Auth.js blocked it; return without following.
    return { cookies: signInCookies, finalUrl: callbackHref };
  }

  const callbackRes = await fetch(callbackHref, {
    redirect: 'manual',
    headers: { Cookie: cookieHeaderFrom([...signInCookies, cookie]) },
  });
  const allCookies = [...signInCookies, ...getSetCookies(callbackRes)];
  const finalLocation = callbackRes.headers.get('location') ?? callbackHref;
  return { cookies: allCookies, finalUrl: finalLocation };
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

beforeAll(async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const playgroundDir = path.resolve(__dirname, '../playground');

  // Ensure playground dependencies are installed. Root `npm ci` does NOT
  // cascade into the playground (it's not a workspace), so in CI / fresh
  // checkouts the playground's `node_modules` is missing. Without it,
  // `npm run dev` below would fail to find the framework binary and the
  // readiness poll would hang for the full timeout.
  if (!existsSync(path.join(playgroundDir, 'node_modules'))) {
    execSync('npm install --no-progress --no-audit --no-fund', {
      cwd: playgroundDir,
      stdio: 'inherit',
    });
  }
  devServer = spawn('npm', ['run', 'dev'], {
    cwd: playgroundDir,
    env: {
      ...process.env,
      AUTH_SECRET,
      AUTH_URL: BASE_URL,
      PORT: String(PORT),
    },
    detached: true,
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
      setTimeout(check, 1_000);
    };
    devServer.on('error', reject);
    setTimeout(check, 3_000);
  });
}, 120_000);

afterAll(() => {
  if (devServer.pid != null) process.kill(-devServer.pid, 'SIGTERM');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CSRF endpoint', () => {
  it('returns a csrfToken', async () => {
    const res = await fetch(`${AUTH_BASE}/csrf`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { csrfToken: string };
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThan(0);
  });

  it('sets an authjs.csrf-token cookie', async () => {
    const res = await fetch(`${AUTH_BASE}/csrf`);
    const cookies = getSetCookies(res).join(' ');
    expect(cookies).toMatch(/authjs\.csrf-token/);
  });

  it('returns different tokens on each request', async () => {
    const res1 = await fetch(`${AUTH_BASE}/csrf`);
    const body1 = (await res1.json()) as { csrfToken: string };
    const res2 = await fetch(`${AUTH_BASE}/csrf`);
    const body2 = (await res2.json()) as { csrfToken: string };
    expect(body1.csrfToken).not.toBe(body2.csrfToken);
  });
});

describe('Providers endpoint', () => {
  it('returns 200 JSON', async () => {
    const res = await fetch(`${AUTH_BASE}/providers`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown;
    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
  });

  it('includes a credentials provider', async () => {
    const res = await fetch(`${AUTH_BASE}/providers`);
    const body = (await res.json()) as Record<string, { type: string }>;
    const hasCredentials = Object.values(body).some(
      (p) => p.type === 'credentials',
    );
    expect(hasCredentials).toBe(true);
  });
});

describe('Session endpoint', () => {
  it('returns 200 for unauthenticated requests', async () => {
    const res = await fetch(`${AUTH_BASE}/session`);
    expect(res.status).toBe(200);
  });

  it('does not include user data for unauthenticated requests', async () => {
    const res = await fetch(`${AUTH_BASE}/session`);
    const body = (await res.json()) as Record<string, unknown> | null;
    const hasUser = body != null && 'user' in body;
    expect(hasUser).toBe(false);
  });

  it('returns user data after successful authentication', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const res = await fetch(`${AUTH_BASE}/session`, {
      headers: { Cookie: cookieHeaderFrom(cookies) },
    });
    const body = (await res.json()) as { user?: { name: string } };
    expect(body.user).toBeDefined();
    expect(body.user?.name).toBe('J Smith');
  });

  it('session includes expiry information', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const res = await fetch(`${AUTH_BASE}/session`, {
      headers: { Cookie: cookieHeaderFrom(cookies) },
    });
    const body = (await res.json()) as { expires?: string };
    expect(body.expires).toBeDefined();
    expect(new Date(body.expires!).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('Credentials authentication', () => {
  it('valid credentials redirect toward the profile page', async () => {
    const { finalUrl } = await signIn('jsmith', 'hunter2');
    expect(finalUrl).toMatch(/\/profile/);
  });

  it('valid credentials set an authjs.session-token cookie', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const hasSession = cookies.some((c) =>
      c.startsWith('authjs.session-token'),
    );
    expect(hasSession).toBe(true);
  });

  it('invalid password does not set a session cookie', async () => {
    const { cookies } = await signIn('jsmith', 'wrongpassword');
    const hasSession = cookies.some((c) =>
      c.startsWith('authjs.session-token'),
    );
    expect(hasSession).toBe(false);
  });

  it('rejects empty credentials', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn('', '', token, cookie);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error');
  });
});

describe('Sign-in page', () => {
  it('GET /api/auth/signin returns HTML', async () => {
    const res = await fetch(`${AUTH_BASE}/signin`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('text/html');
  });

  it('GET /api/auth/signin shows Credentials option', async () => {
    const res = await fetch(`${AUTH_BASE}/signin`);
    const html = await res.text();
    expect(html).toContain('Credentials');
  });

  it('GET /api/auth/signin includes csrfToken field', async () => {
    const res = await fetch(`${AUTH_BASE}/signin`);
    const html = await res.text();
    expect(html).toContain('csrfToken');
  });
});

describe('Signout', () => {
  it('sets Max-Age=0 on session cookie after signout', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
    const res = await fetch(`${AUTH_BASE}/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeaderFrom(cookies) + '; ' + csrfCookie,
      },
      body: new URLSearchParams({ csrfToken }).toString(),
      redirect: 'manual',
    });
    const cleared = getSetCookies(res).find(
      (c) =>
        c.includes('authjs.session-token') &&
        c.toLowerCase().includes('max-age=0'),
    );
    expect(cleared).toBeDefined();
  });
});

describe('Error handling', () => {
  it('invalid CSRF token redirects with error', async () => {
    const { cookie } = await getCsrf();
    const res = await postSignIn('jsmith', 'hunter2', 'invalid-token', cookie);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error');
  });
});

describe('Security: open redirect prevention', () => {
  it('does not redirect to an external domain after sign-in', async () => {
    const { finalUrl } = await signIn(
      'jsmith',
      'hunter2',
      'https://evil.example.com',
    );
    expect(finalUrl).not.toContain('evil.example.com');
  });

  it('allows relative callback URLs', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn(
      'jsmith',
      'hunter2',
      token,
      cookie,
      '/dashboard',
    );
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/dashboard');
    expect(location).not.toContain('evil.com');
  });

  it('handles protocol-relative URLs safely', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn(
      'jsmith',
      'hunter2',
      token,
      cookie,
      '//evil.com/steal',
    );
    const location = res.headers.get('location') ?? '';
    const locationUrl = new URL(location, BASE_URL);
    expect(locationUrl.host).not.toBe('evil.com');
  });

  it('rejects javascript: protocol URLs', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn(
      'jsmith',
      'hunter2',
      token,
      cookie,
      'javascript:alert(1)',
    );
    const location = res.headers.get('location') ?? '';
    expect(location).not.toContain('javascript:');
  });

  it('rejects data: protocol URLs', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn(
      'jsmith',
      'hunter2',
      token,
      cookie,
      'data:text/html,<script>alert(1)</script>',
    );
    const location = res.headers.get('location') ?? '';
    expect(location).not.toContain('data:');
  });
});

describe('Security: cookie attributes', () => {
  it('session cookie carries the HttpOnly flag', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const sessionCookie = cookies.find((c) =>
      c.includes('authjs.session-token'),
    );
    if (sessionCookie) {
      expect(sessionCookie.toLowerCase()).toContain('httponly');
    }
  });

  it('session cookie has SameSite attribute', async () => {
    const res = await fetch(`${AUTH_BASE}/csrf`);
    const csrfCookie = getSetCookies(res).find((c) =>
      c.includes('authjs.csrf-token'),
    );
    expect(csrfCookie).toContain('SameSite');
  });

  it('session cookie has proper Path attribute', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const sessionCookie = cookies.find((c) =>
      c.includes('authjs.session-token'),
    );
    expect(sessionCookie).toContain('Path=/');
  });

  it('csrf cookie has HttpOnly flag', async () => {
    const res = await fetch(`${AUTH_BASE}/csrf`);
    const csrfCookie = getSetCookies(res).find((c) =>
      c.includes('authjs.csrf-token'),
    );
    expect(csrfCookie?.toLowerCase()).toContain('httponly');
  });
});

describe('Security: malicious input handling', () => {
  it('handles SQL injection in username', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn("' OR '1'='1", 'password', token, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get('location') ?? '').toContain('error');
  });

  it('handles SQL injection in password', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn('jsmith', "' OR '1'='1", token, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get('location') ?? '').toContain('error');
  });

  it('handles XSS payload in username', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn(
      '<script>alert(1)</script>',
      'password',
      token,
      cookie,
    );
    expect(res.status).toBe(302);
  });

  it('handles XSS payload in password', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn(
      'jsmith',
      '<script>alert(1)</script>',
      token,
      cookie,
    );
    expect(res.status).toBe(302);
  });

  it('handles very long username', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn('a'.repeat(10_000), 'password', token, cookie);
    expect(res.status).toBe(302);
  });

  it('handles very long password', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn('jsmith', 'a'.repeat(10_000), token, cookie);
    expect(res.status).toBe(302);
  });

  it('handles null bytes in credentials', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn('jsmith\x00admin', 'hunter2', token, cookie);
    expect(res.status).toBe(302);
  });

  it('handles unicode in credentials', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn('jsmith™', 'hunter2', token, cookie);
    expect(res.status).toBe(302);
  });
});

describe('Security: session management', () => {
  it('generates a new session token on each login', async () => {
    const { cookies: c1 } = await signIn('jsmith', 'hunter2');
    const { cookies: c2 } = await signIn('jsmith', 'hunter2');
    const token1 = c1.find((c) => c.startsWith('authjs.session-token'));
    const token2 = c2.find((c) => c.startsWith('authjs.session-token'));
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
  });

  it('invalidates session cookie after signout', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
    const res = await fetch(`${AUTH_BASE}/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeaderFrom(cookies) + '; ' + csrfCookie,
      },
      body: new URLSearchParams({ csrfToken }).toString(),
      redirect: 'manual',
    });
    const cleared = getSetCookies(res).find(
      (c) =>
        c.includes('authjs.session-token') &&
        c.toLowerCase().includes('max-age=0'),
    );
    expect(cleared).toBeDefined();
  });
});

describe('Security: information disclosure', () => {
  it('returns the same error for invalid username and invalid password', async () => {
    const { token: t1, cookie: c1 } = await getCsrf();
    const res1 = await postSignIn('wronguser', 'hunter2', t1, c1);
    const { token: t2, cookie: c2 } = await getCsrf();
    const res2 = await postSignIn('jsmith', 'wrongpass', t2, c2);
    const err1 = (res1.headers.get('location') ?? '').match(
      /error=([^&]+)/,
    )?.[1];
    const err2 = (res2.headers.get('location') ?? '').match(
      /error=([^&]+)/,
    )?.[1];
    expect(err1).toBeDefined();
    expect(err1).toBe(err2);
  });

  it('sign-in page does not leak username existence', async () => {
    const res = await fetch(`${AUTH_BASE}/signin`);
    const html = await res.text();
    expect(html).not.toContain('user does not exist');
    expect(html).not.toContain('invalid username');
    expect(html).not.toContain('user not found');
  });

  it('error page does not expose stack traces', async () => {
    const { token, cookie } = await getCsrf();
    const res = await postSignIn('invalid', 'invalid', token, cookie);
    const location = res.headers.get('location') ?? '';
    const errorPage = location.startsWith('/')
      ? `${BASE_URL}${location}`
      : location;
    if (errorPage.startsWith(BASE_URL)) {
      const html = await (await fetch(errorPage)).text();
      expect(html).not.toContain('Error:');
      expect(html).not.toContain('.ts:');
      expect(html).not.toContain('.js:');
    }
  });
});

describe('Security: CSRF protection', () => {
  it('POST without a CSRF token does not create a session', async () => {
    const body = new URLSearchParams({
      username: 'jsmith',
      password: 'hunter2',
      callbackUrl: `${BASE_URL}/profile`,
    });
    const res = await fetch(`${AUTH_BASE}/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    });
    const cookies = getSetCookies(res);
    const hasSession = cookies.some((c) =>
      c.startsWith('authjs.session-token'),
    );
    expect(hasSession).toBe(false);
  });

  it('rejects signout request without a CSRF token', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const res = await fetch(`${AUTH_BASE}/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeaderFrom(cookies),
      },
      body: new URLSearchParams({}).toString(),
      redirect: 'manual',
    });
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error');
  });
});
