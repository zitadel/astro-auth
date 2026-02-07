import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import type { APIContext } from 'astro';
import GitHub from '@auth/core/providers/github';

type ExtHeaders = Headers & { getSetCookie?: () => string[] };

declare global {
  var Astro: { response: { headers: Headers } };
}

const makeAuthResponse = <T>(
  body: T,
  status = 200,
  setCookie?: string | string[],
): Response => {
  const headers = new Headers();
  if (setCookie) {
    if (Array.isArray(setCookie)) {
      for (const v of setCookie) headers.append('set-cookie', v);
    } else {
      headers.set('set-cookie', setCookie);
    }
  }
  return new Response(JSON.stringify(body), { status, headers });
};

const mockCreateActionURL = () => 'http://internal/auth/session';

const makeCfg = () => ({
  providers: [] as Array<ReturnType<typeof GitHub>>,
  basePath: '/api/auth',
  trustHost: true,
  secret: 'test-secret-12345678901234567890____',
});

describe('server', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-12345678901234567890____';
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
    delete (globalThis as Record<string, unknown>).Astro;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  describe('AstroAuth handlers', () => {
    it('exposes GET and POST', async () => {
      const { AstroAuth } = await import('../src/server.js');
      const mod = AstroAuth({ providers: [] });
      expect(typeof mod.GET).toBe('function');
      expect(typeof mod.POST).toBe('function');
    });

    it('GET /providers with basePath returns JSON', async () => {
      const { AstroAuth } = await import('../src/server.js');
      const { GET } = AstroAuth({ ...makeCfg() });
      const ctx = {
        request: new Request('http://x.local/api/auth/providers'),
      } as APIContext;
      const res = await GET(ctx);
      expect(res).toBeInstanceOf(Response);
      const json = await (res as Response).json();
      expect(typeof json).toBe('object');
    });

    it('GET outside basePath returns undefined', async () => {
      const { AstroAuth } = await import('../src/server.js');
      const { GET } = AstroAuth({ ...makeCfg() });
      const ctx = {
        request: new Request('http://x.local/not-auth/providers'),
      } as APIContext;
      const res = await GET(ctx);
      expect(res).toBeUndefined();
    });

    it('GET with configured provider lists it', async () => {
      const { AstroAuth } = await import('../src/server.js');
      const { GET } = AstroAuth({
        ...makeCfg(),
        providers: [GitHub({ clientId: 'a', clientSecret: 'b' })],
      });
      const ctx = {
        request: new Request('http://x.local/api/auth/providers'),
      } as APIContext;
      const res = await GET(ctx);
      const json = await (res as Response).json();
      expect(json).toHaveProperty('github');
      expect(json.github).toHaveProperty('id', 'github');
      expect(json.github).toHaveProperty('name', 'GitHub');
    });

    it('POST passthrough on callback route', async () => {
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: jest
          .fn()
          .mockImplementation(() => makeAuthResponse({ ok: true }, 200)),
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { AstroAuth } = await import('../src/server.js');
      const { POST } = AstroAuth({ ...makeCfg() });
      const form = new URLSearchParams({ a: '1' });
      const ctx = {
        request: new Request('http://x.local/api/auth/callback/credentials', {
          method: 'POST',
          body: form,
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        }),
      } as APIContext;
      const res = await POST(ctx);
      expect(res).toBeInstanceOf(Response);
      expect(res?.status).toBe(200);
    });
  });

  describe('getSession', () => {
    it('returns null when Auth responds with empty object', async () => {
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: jest.fn().mockImplementation(() => makeAuthResponse({}, 200)),
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      const ses = await getSession(new Request('http://x.local/'), makeCfg());
      expect(ses).toBeNull();
    });

    it('returns session object on 200 with data', async () => {
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: jest
          .fn()
          .mockImplementation(() =>
            makeAuthResponse(
              { user: { name: 'T' }, expires: '2099-01-01T00:00:00.000Z' },
              200,
            ),
          ),
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      const ses = await getSession(new Request('http://x.local/'), makeCfg());
      expect(ses).not.toBeNull();
      expect(ses?.user?.name).toBe('T');
    });

    it('throws with status and payload on non-200', async () => {
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: jest
          .fn()
          .mockImplementation(() => makeAuthResponse({ message: 'boom' }, 500)),
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      await expect(
        getSession(new Request('http://x.local/'), makeCfg()),
      ).rejects.toThrow(
        '[astro-auth] getSession failed: 500 {"message":"boom"}',
      );
    });

    it('forwards incoming cookies to Auth', async () => {
      const spy = jest
        .fn<(r: Request) => Response>()
        .mockImplementation((r) => {
          expect(r.headers.get('cookie')).toContain(
            'authjs.session-token=session123',
          );
          return makeAuthResponse(
            { user: { name: 'C' }, expires: '2099-01-01T00:00:00.000Z' },
            200,
          );
        });
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: spy,
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      const req = new Request('http://x.local/', {
        headers: { cookie: 'authjs.session-token=session123; other=x' },
      });
      const ses = await getSession(req, makeCfg());
      expect(ses?.user?.name).toBe('C');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('omits cookie header when none are present', async () => {
      const spy = jest
        .fn<(r: Request) => Response>()
        .mockImplementation((r) => {
          expect(r.headers.has('cookie')).toBe(false);
          return makeAuthResponse(
            { user: { id: 'n' }, expires: '2099-01-01T00:00:00.000Z' },
            200,
          );
        });
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: spy,
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      const ses = await getSession(new Request('http://x.local/'), makeCfg());
      expect(ses?.user?.id).toBe('n');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('accepts __Secure-authjs.session-token cookie', async () => {
      const spy = jest
        .fn<(r: Request) => Response>()
        .mockImplementation((r) => {
          const c = r.headers.get('cookie') || '';
          expect(c).toMatch(/__Secure-authjs\.session-token=secure123/);
          return makeAuthResponse(
            { user: { id: 'u' }, expires: '2099-01-01T00:00:00.000Z' },
            200,
          );
        });
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: spy,
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      const req = new Request('http://x.local/', {
        headers: { cookie: '__Secure-authjs.session-token=secure123' },
      });
      const ses = await getSession(req, makeCfg());
      expect(ses?.user?.id).toBe('u');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('passes hashed cookie variant authjs.session-token.<hash>', async () => {
      const spy = jest
        .fn<(r: Request) => Response>()
        .mockImplementation((r) => {
          const c = r.headers.get('cookie') || '';
          expect(c).toContain('authjs.session-token.hash_abc=valxyz');
          return makeAuthResponse(
            { user: { email: 'e' }, expires: '2099-01-01T00:00:00.000Z' },
            200,
          );
        });
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: spy,
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      const req = new Request('http://x.local/', {
        headers: { cookie: 'authjs.session-token.hash_abc=valxyz' },
      });
      const ses = await getSession(req, makeCfg());
      expect(ses?.user?.email).toBe('e');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('propagates Set-Cookie headers from Auth to Astro.response.headers', async () => {
      const setCookie = [
        'authjs.session-token=newtok; Path=/; HttpOnly; Secure; SameSite=Lax',
        'authjs.csrf-token=csrfv; Path=/; HttpOnly; Secure; SameSite=Lax',
      ];
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: jest
          .fn()
          .mockImplementation(() =>
            makeAuthResponse(
              { user: { name: 'N' }, expires: '2099-01-01T00:00:00.000Z' },
              200,
              setCookie,
            ),
          ),
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      (globalThis as { Astro: { response: { headers: Headers } } }).Astro = {
        response: { headers: new Headers() },
      };
      const { getSession } = await import('../src/server.js');
      const ses = await getSession(
        new Request('http://x.local/', {
          headers: { cookie: 'authjs.session-token=old' },
        }),
        makeCfg(),
      );
      expect(ses?.user?.name).toBe('N');
      const h = globalThis.Astro.response.headers as ExtHeaders;
      if (typeof h.getSetCookie === 'function') {
        expect(h.getSetCookie()).toEqual(expect.arrayContaining(setCookie));
      } else {
        const combined = h.get('set-cookie') ?? '';
        expect(combined).toContain('authjs.session-token=');
        expect(combined).toContain('authjs.csrf-token=');
      }
    });

    it('propagates a single Set-Cookie header', async () => {
      const setCookie =
        'authjs.session-token=solo; Path=/; HttpOnly; Secure; SameSite=Lax';
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: jest
          .fn()
          .mockImplementation(() =>
            makeAuthResponse(
              { user: { id: 's' }, expires: '2099-01-01T00:00:00.000Z' },
              200,
              setCookie,
            ),
          ),
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      (globalThis as { Astro: { response: { headers: Headers } } }).Astro = {
        response: { headers: new Headers() },
      };
      const { getSession } = await import('../src/server.js');
      const ses = await getSession(new Request('http://x.local/'), makeCfg());
      expect(ses?.user?.id).toBe('s');
      const h = globalThis.Astro.response.headers as ExtHeaders;
      if (typeof h.getSetCookie === 'function') {
        expect(h.getSetCookie()).toEqual(expect.arrayContaining([setCookie]));
      } else {
        const combined = h.get('set-cookie') ?? '';
        expect(combined).toContain('authjs.session-token=solo');
      }
    });

    it('forwards host and x-forwarded headers to Auth', async () => {
      const spy = jest
        .fn<(r: Request) => Response>()
        .mockImplementation((r) => {
          expect(r.headers.get('host')).toBe('example.com');
          expect(r.headers.get('x-forwarded-proto')).toBe('https');
          expect(r.headers.get('x-forwarded-host')).toBe('example.com');
          expect(r.headers.get('x-forwarded-port')).toBe('443');
          return makeAuthResponse(
            { user: { name: 'H' }, expires: '2099-01-01T00:00:00.000Z' },
            200,
          );
        });
      jest.unstable_mockModule('@auth/core', () => ({
        Auth: spy,
        createActionURL: jest.fn().mockImplementation(mockCreateActionURL),
        setEnvDefaults: jest.fn(),
      }));
      const { getSession } = await import('../src/server.js');
      const req = new Request('https://example.com/profile', {
        headers: {
          host: 'example.com',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'example.com',
          'x-forwarded-port': '443',
        },
      });
      const ses = await getSession(req, makeCfg());
      expect(ses?.user?.name).toBe('H');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
