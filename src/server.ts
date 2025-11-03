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
 * npm install @auth/core @auth/astro
 * ```
 */
import { Auth, createActionURL, setEnvDefaults } from '@auth/core';
import type { APIContext } from 'astro';
import authConfig from 'auth:config';
import type { AstroAuthConfig, GetSessionResult } from './types';
import type Cookie from 'cookie';

function AstroAuthHandler(prefix: string, options = authConfig) {
  return async ({ cookies, request }: APIContext) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(prefix + '/')) {
      return;
    }

    const res = await Auth(request, options);
    // @ts-expect-error since it doesn't work
    const setCookies = res.cookies;
    if (setCookies && setCookies.length > 0) {
      // @ts-expect-error since it doesn't work
      res.cookies.forEach((cookie: Cookie) => {
        const { name, value, options: authOptions } = cookie;
        const { ...astroOptions } = authOptions;
        cookies.set(name, value, astroOptions);
      });
    }
    return res;
  };
}

/**
 * Creates a set of Astro endpoints for authentication.
 *
 * @example
 * ```ts
 * export const { GET, POST } = AstroAuth({
 *   providers: [
 *     GitHub({
 *       clientId: process.env.GITHUB_ID!,
 *       clientSecret: process.env.GITHUB_SECRET!,
 *     }),
 *   ],
 *   debug: false,
 * })
 * ```
 * @param config The configuration for authentication providers and other options.
 * @returns An object with `GET` and `POST` methods that can be exported in an Astro endpoint.
 */
export function AstroAuth(options = authConfig) {
  const { AUTH_SECRET, AUTH_TRUST_HOST, VERCEL, NODE_ENV } = import.meta.env;

  options.secret ??= AUTH_SECRET;
  options.trustHost ??= !!(
    AUTH_TRUST_HOST ??
    VERCEL ??
    NODE_ENV !== 'production'
  );

  const { prefix = '/api/auth', ...authOptions } = options;

  const handler = AstroAuthHandler(prefix, authOptions);
  return {
    async GET(context: APIContext) {
      return await handler(context);
    },
    async POST(context: APIContext) {
      return await handler(context);
    },
  };
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
 *
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
): GetSessionResult {
  setEnvDefaults(process.env, config);

  const url = createActionURL(
    'session',
    new URL(req.url).protocol.replace(':', ''),
    new Headers(req.headers),
    process.env,
    config,
  );

  const response = await Auth(
    new Request(url, {
      headers: {
        cookie: new Headers(req.headers).get('cookie') ?? '',
      },
    }),
    config,
  );

  const { status = 200 } = response;
  const data = await response.json();

  if (!data || !Object.keys(data).length) {
    return null;
  } else if (status === 200) {
    return data;
  } else {
    throw new Error(data.message);
  }
}
