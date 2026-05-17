import { describe, expect, it, beforeAll, afterAll, jest } from '@jest/globals';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Integration tests spin up a real dev server — increase the per-test timeout.
jest.setTimeout(120_000);

const PORT = 3002;
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
  if (typeof (res.headers as Record<string, unknown>).getSetCookie === 'function') {
    return (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
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
  return { token: body.csrfToken, cookie: cookieHeaderFrom(getSetCookies(res)) };
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
  return fetch(`${AUTH_BASE}/signin/credentials`, {
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
  const signInRes = await postSignIn(username, password, token, cookie, callbackUrl);
  const signInCookies = getSetCookies(signInRes);

  const location = signInRes.headers.get('location');
  if (!location) return { cookies: signInCookies, finalUrl: '' };

  // Follow the callback redirect (stays on the same host).
  const callbackHref = location.startsWith('/') ? `${BASE_URL}${location}` : location;
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

  devServer = spawn('npm', ['run', 'dev'], {
    cwd: playgroundDir,
    env: {
      ...process.env,
      AUTH_SECRET,
      PORT: String(PORT),
    },
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
  devServer.kill('SIGTERM');
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
    const hasCredentials = Object.values(body).some((p) => p.type === 'credentials');
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
});

describe('Credentials authentication', () => {
  it('valid credentials redirect toward the profile page', async () => {
    const { finalUrl } = await signIn('jsmith', 'hunter2');
    expect(finalUrl).toMatch(/\/profile/);
  });

  it('valid credentials set an authjs.session-token cookie', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const hasSession = cookies.some((c) => c.startsWith('authjs.session-token'));
    expect(hasSession).toBe(true);
  });

  it('invalid password does not set a session cookie', async () => {
    const { cookies } = await signIn('jsmith', 'wrongpassword');
    const hasSession = cookies.some((c) => c.startsWith('authjs.session-token'));
    expect(hasSession).toBe(false);
  });
});

describe('Sign-in page', () => {
  it('GET /api/auth/signin returns HTML', async () => {
    const res = await fetch(`${AUTH_BASE}/signin`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('text/html');
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
});

describe('Security: cookie attributes', () => {
  it('session cookie carries the HttpOnly flag', async () => {
    const { cookies } = await signIn('jsmith', 'hunter2');
    const sessionCookie = cookies.find((c) => c.includes('authjs.session-token'));
    if (sessionCookie) {
      expect(sessionCookie.toLowerCase()).toContain('httponly');
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
    const res = await fetch(`${AUTH_BASE}/signin/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    });
    const cookies = getSetCookies(res);
    const hasSession = cookies.some((c) => c.startsWith('authjs.session-token'));
    expect(hasSession).toBe(false);
  });
});
