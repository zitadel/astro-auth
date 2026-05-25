import { describe, expect, it, beforeAll, afterAll, jest } from '@jest/globals';
import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Integration tests spin up a real dev server — increase the per-test timeout.
jest.setTimeout(120_000);

const PORT = 3853;
const BASE_URL = `http://localhost:${PORT}`;
const AUTH_BASE = `${BASE_URL}/api/auth`;
const AUTH_SECRET = 'test-secret-for-e2e-testing-only-32ch';

let devServer: ChildProcess;

// ---------------------------------------------------------------------------
// Helpers (mirrors auth-integration.test.ts)
// ---------------------------------------------------------------------------

function getSetCookies(res: Response): string[] {
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

function cookieHeaderFrom(setCookies: string[]): string {
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

async function getCsrf(): Promise<{ token: string; cookie: string }> {
  const res = await fetch(`${AUTH_BASE}/csrf`);
  const body = (await res.json()) as { csrfToken: string };
  return {
    token: body.csrfToken,
    cookie: cookieHeaderFrom(getSetCookies(res)),
  };
}

/** Sign in and collect all Set-Cookie values (including session-token). */
async function signIn(username: string, password: string): Promise<string[]> {
  const { token, cookie } = await getCsrf();
  const body = new URLSearchParams({
    username,
    password,
    csrfToken: token,
    callbackUrl: `${BASE_URL}/profile`,
  });
  const signInRes = await fetch(`${AUTH_BASE}/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: body.toString(),
    redirect: 'manual',
  });
  const signInCookies = getSetCookies(signInRes);

  const location = signInRes.headers.get('location');
  if (!location) return signInCookies;

  const callbackHref = location.startsWith('/')
    ? `${BASE_URL}${location}`
    : location;
  if (!callbackHref.startsWith(BASE_URL)) return signInCookies;

  const callbackRes = await fetch(callbackHref, {
    redirect: 'manual',
    headers: { Cookie: cookieHeaderFrom([...signInCookies, cookie]) },
  });
  return [...signInCookies, ...getSetCookies(callbackRes)];
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
    execSync('npm ci --no-progress --no-audit --no-fund', {
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

describe('Unauthenticated access', () => {
  it('GET /api/unprotected returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/unprotected`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('GET /api/secured returns 403', async () => {
    const res = await fetch(`${BASE_URL}/api/secured`);
    expect(res.status).toBe(403);
  });

  it('GET /api/protected/middleware returns 403', async () => {
    const res = await fetch(`${BASE_URL}/api/protected/middleware`);
    expect(res.status).toBe(403);
  });
});

describe('Authenticated access', () => {
  let sessionCookieHeader: string;

  beforeAll(async () => {
    const cookies = await signIn('jsmith', 'hunter2');
    sessionCookieHeader = cookieHeaderFrom(cookies);
  }, 30_000);

  it('GET /api/unprotected returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/unprotected`, {
      headers: { Cookie: sessionCookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('GET /api/secured returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/secured`, {
      headers: { Cookie: sessionCookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('GET /api/protected/middleware returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/protected/middleware`, {
      headers: { Cookie: sessionCookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
