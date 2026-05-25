/**
 * > **caution**
 * > `astro-auth` is currently experimental. Be aware of breaking changes between versions.
 *
 *
 * Astro Auth is the unofficial Astro integration for Auth.js.
 * It provides a simple way to add authentication to your Astro site in a few lines of code.
 *
 * ## Installation
 *
 * `astro-auth` requires building your site in `server` mode with a platform adaper like `@astrojs/node`.
 * ```js
 * // astro.config.mjs
 * export default defineConfig({
 *   output: "server",
 *   adapter: node({
 *     mode: 'standalone'
 *   })
 * });
 * ```
 *
 * ```bash npm2yarn2pnpm
 * npm install @auth/core @zitadel/astro-auth
 * ```
 */
import { Auth, createActionURL, setEnvDefaults } from '@auth/core';
import type { APIContext } from 'astro';
import authConfig from 'auth:config';
import type { AstroAuthConfig } from './types.js';
import type { Session } from '@auth/core/types';

function AstroAuthHandler(prefix: string, options = authConfig) {
  const normalizedPrefix = prefix.replace(/\/$/, '');
  return async ({ request }: APIContext) => {
    const url = new URL(request.url);
    // Only handle requests that match our prefix path
    // Non-matching paths return undefined because this handler is mounted as [...auth]
    if (!url.pathname.startsWith(normalizedPrefix + '/')) {
      return;
    }

    return await Auth(request, options);
  };
}

/**
 * Creates a set of Astro endpoints for authentication.
 *
 * @param options - The configuration for authentication providers and other options.
 * @returns An object with `GET` and `POST` methods that can be exported in an Astro endpoint.
 * @throws {Error} When auth configuration is not found or not properly configured.
 *
 * @example
 * ```ts
 * export const { GET, POST } = AstroAuth({
 *   providers: [
 *     Zitadel({
 *       clientId: process.env.ZITADEL_CLIENT_ID!,
 *       clientSecret: process.env.ZITADEL_CLIENT_SECRET!,
 *     }),
 *   ],
 *   debug: false,
 * })
 * ```
 */
export function AstroAuth(options = authConfig) {
  const config = options ?? authConfig;
  if (!config) {
    throw new Error(
      'Auth configuration not found. Please ensure auth.config is properly configured.',
    );
  }
  const { prefix = '/api/auth', ...authOptions } = config;

  const handler = AstroAuthHandler(prefix, authOptions);

  function defaultBasePath(): string {
    return (prefix ?? '/api/auth').replace(/\/$/, '');
  }

  /**
   * Returns the relative URL of the sign-in endpoint, with `callbackUrl`
   * appended when `redirectTo` is provided. Useful when the framework's
   * native redirect helper takes a URL string (e.g. `Astro.redirect(url)`).
   */
  function signInUrl(options: { redirectTo?: string } = {}): string {
    const basePath = defaultBasePath();
    const params = new URLSearchParams();
    if (options.redirectTo) params.set('callbackUrl', options.redirectTo);
    const paramStr = params.toString();
    return `${basePath}/signin${paramStr ? `?${paramStr}` : ''}`;
  }

  /**
   * Returns the relative URL of the sign-out endpoint, with `callbackUrl`
   * appended when `redirectTo` is provided.
   */
  function signOutUrl(options: { redirectTo?: string } = {}): string {
    const basePath = defaultBasePath();
    const params = new URLSearchParams();
    if (options.redirectTo) params.set('callbackUrl', options.redirectTo);
    const paramStr = params.toString();
    return `${basePath}/signout${paramStr ? `?${paramStr}` : ''}`;
  }

  async function signIn(
    provider?: string,
    options: { redirectTo?: string } = {},
  ): Promise<Response> {
    // The `provider` argument is intentionally ignored on the server side:
    // Auth.js's per-provider sign-in endpoint (/api/auth/signin/{provider})
    // requires a POST with a CSRF token, which a 302 redirect cannot
    // produce. Server-side signIn always routes through the chooser
    // (/api/auth/signin); when `pages.signIn` is configured, Auth.js then
    // bounces to the consumer's custom sign-in page (where the POST form
    // + CSRF live). The `provider` arg is kept in the signature for
    // parity with client-side signIn() callers.
    void provider;
    // Use a raw Response rather than Response.redirect(): the static
    // Response.redirect() method validates the URL and rejects relative
    // ones, but we don't have the request origin in this scope. Browsers
    // accept relative Location headers per RFC 7231 §7.1.2.
    return new Response(null, {
      status: 302,
      headers: { Location: signInUrl(options) },
    });
  }

  async function signOut(
    options: { redirectTo?: string } = {},
  ): Promise<Response> {
    return new Response(null, {
      status: 302,
      headers: { Location: signOutUrl(options) },
    });
  }

  async function GET(context: APIContext) {
    return await handler(context);
  }
  async function POST(context: APIContext) {
    return await handler(context);
  }

  /**
   * Bound to the factory's config closure so callers don't need to pass
   * `authConfig` explicitly. Matches the canonical factory return shape
   * used by next-auth / remix-auth / solidstart-auth / tanstack-auth.
   */
  async function getSessionBound(req: Request): Promise<Session | null> {
    return getSession(req, config as AstroAuthConfig);
  }

  return {
    // `handlers` alias so users can destructure the same way as in
    // next-auth / remix-auth / solidstart-auth / tanstack-auth, while
    // top-level GET/POST remain for the existing `export const { GET, POST }`
    // pattern. Both forms share the same handler implementations.
    handlers: { GET, POST },
    GET,
    POST,
    getSession: getSessionBound,
    /** @deprecated use `getSession` instead */
    auth: getSessionBound,
    signIn,
    signInUrl,
    signOut,
    signOutUrl,
  };
}

/**
 * Module-level URL/Response helpers that mirror the factory-returned ones.
 *
 * Provided so Astro pages can import them directly from
 * `@zitadel/astro-auth/server` without needing access to the `AstroAuth()`
 * closure (which lives inside the `[...auth]` route file). These use the
 * default basePath `/api/auth` — matching the default the auth integration
 * mounts at. Users who configure the integration with a custom prefix
 * should call the factory-returned versions from their route file.
 */
const DEFAULT_BASE_PATH = '/api/auth';

/**
 * Returns the relative URL of the sign-in endpoint at the default
 * basePath `/api/auth`, with `callbackUrl` appended when `redirectTo`
 * is provided. Useful for `Astro.redirect(signInUrl({ redirectTo: ... }))`.
 */
export function signInUrl(options: { redirectTo?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.redirectTo) params.set('callbackUrl', options.redirectTo);
  const paramStr = params.toString();
  return `${DEFAULT_BASE_PATH}/signin${paramStr ? `?${paramStr}` : ''}`;
}

/**
 * Returns the relative URL of the sign-out endpoint at the default
 * basePath `/api/auth`, with `callbackUrl` appended when `redirectTo`
 * is provided.
 */
export function signOutUrl(options: { redirectTo?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.redirectTo) params.set('callbackUrl', options.redirectTo);
  const paramStr = params.toString();
  return `${DEFAULT_BASE_PATH}/signout${paramStr ? `?${paramStr}` : ''}`;
}

/**
 * Returns a 302 Response with `Location` pointing at the sign-in
 * endpoint. Useful for `return signIn({ redirectTo: '/profile' })` from
 * an Astro page's frontmatter when the page is unauthenticated.
 */
export async function signIn(
  options: { redirectTo?: string } = {},
): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: { Location: signInUrl(options) },
  });
}

/**
 * Returns a 302 Response with `Location` pointing at the sign-out
 * endpoint.
 */
export async function signOut(
  options: { redirectTo?: string } = {},
): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: { Location: signOutUrl(options) },
  });
}

/**
 * Retrieves the current session for a Request.
 *
 * This function extracts session information from the request cookies and
 * validates it against the Auth.js configuration. It returns the session
 * object if valid or null if no valid session exists.
 *
 * @param req - The Request object
 * @param config - The authentication configuration
 * @returns Promise resolving to session data or null
 * @throws {Error} When session validation fails or Auth.js returns an error
 *
 * @example
 * ```ts
 * const session = await getSession(request, authConfig)
 * if (!session) throw new Error ("Not authenticated")
 * ```
 */
export async function getSession(
  req: Request,
  config: AstroAuthConfig,
): Promise<Session | null> {
  config.basePath ??= '/api/auth';
  setEnvDefaults(process.env, config);
  const url = createActionURL(
    'session',
    new URL(req.url).protocol.slice(0, -1) as 'http' | 'https',
    new Headers(req.headers),
    process.env,
    config,
  );
  const headers = new Headers(req.headers);
  const response = await Auth(
    new Request(url, {
      headers,
    }),
    config,
  );
  const status = response.status ?? 200;
  const data = (await response.json()) as Record<string, unknown> | null;
  if (!data || !Object.keys(data).length) {
    return null;
  } else {
    const astroGlobal = globalThis as unknown as {
      Astro?: { response?: { headers?: Headers } };
    };
    const target =
      astroGlobal.Astro && astroGlobal.Astro.response
        ? astroGlobal.Astro.response.headers
        : undefined;
    if (target) {
      const h = response.headers as unknown as {
        getSetCookie?: () => string[];
      };
      if (h && typeof h.getSetCookie === 'function') {
        const cookies = h.getSetCookie();
        if (Array.isArray(cookies)) {
          for (const c of cookies) {
            target.append('Set-Cookie', c);
          }
        }
      } else {
        const single = response.headers.get('set-cookie');
        if (single) {
          target.append('Set-Cookie', single);
        }
      }
    }
    if (status === 200) {
      return data as unknown as Session;
    } else {
      throw new Error(
        (data as { message?: string }).message ?? 'Session error',
      );
    }
  }
}
