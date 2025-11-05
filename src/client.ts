import type {
  AstroSignInOptions,
  AstroSignOutParams,
  LiteralUnion,
  SignInAuthorizationParams,
} from './types';

/**
 * Fetches a CSRF token from the authentication server.
 *
 * This is an internal helper function used by signIn and signOut to obtain
 * a valid CSRF token for secure authentication requests.
 *
 * @param prefix - The authentication endpoint prefix (e.g., '/api/auth')
 * @returns A Promise that resolves to the CSRF token string
 * @throws {Error} When the CSRF endpoint returns a non-200 status
 * @throws {Error} When the CSRF endpoint returns a non-JSON response
 * @throws {Error} When the CSRF token is missing or invalid (empty string)
 *
 * @internal
 */
async function __getCsrfToken(prefix: string): Promise<string> {
  const res = await fetch(`${prefix}/csrf`);
  if (!res.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('CSRF endpoint returned non-JSON response');
  }
  const token = (json as { csrfToken?: string })?.csrfToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Missing or invalid CSRF token');
  }
  return token;
}

/**
 * Signs in a user with the specified authentication provider.
 *
 * @param providerId - The authentication provider to use (e.g., 'github', 'google', 'credentials')
 * @param options - Configuration options for the sign-in flow
 * @param authorizationParams - Additional parameters to pass to the OAuth provider
 * @returns A Promise that resolves to a Response object when redirect is false and an error occurs, or void when redirecting
 * @throws {Error} When CSRF token fetch fails or returns invalid data
 * @throws {Error} When the authentication endpoint returns a non-JSON response
 *
 * @example
 * ```ts
 * // Sign in with OAuth provider
 * await signIn('github')
 *
 * // Sign in with custom callback URL
 * await signIn('google', { callbackUrl: '/dashboard' })
 *
 * // Sign in with credentials without redirect
 * const response = await signIn('credentials', { redirect: false }, {
 *   username: 'user',
 *   password: 'pass'
 * })
 * ```
 */
export async function signIn<P extends string | undefined = undefined>(
  providerId?: LiteralUnion<P extends string ? P | string : string>,
  options?: AstroSignInOptions,
  authorizationParams?: SignInAuthorizationParams,
): Promise<Response | void> {
  let callbackUrl = window.location.href;
  let redirect = true;

  if (options) {
    if (options.callbackUrl) {
      callbackUrl = options.callbackUrl;
    }
    if (options.redirect !== undefined) {
      redirect = options.redirect;
    }
  }

  let prefix = '/api/auth';
  const opts: Record<string, unknown> = {};

  if (options) {
    if (options.prefix) {
      prefix = options.prefix;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { prefix: _, callbackUrl: __, redirect: ___, ...rest } = options;
    Object.assign(opts, rest);
  }

  const isCredentials = providerId === 'credentials';
  const isEmail = providerId === 'email';
  const isSupportingReturn = isCredentials || isEmail;

  let signInUrl: string;
  if (isCredentials) {
    signInUrl = `${prefix}/callback/${providerId}`;
  } else {
    signInUrl = `${prefix}/signin/${providerId}`;
  }

  let signInUrlWithParams = signInUrl;
  if (authorizationParams) {
    const params = new URLSearchParams(authorizationParams);
    signInUrlWithParams = `${signInUrl}?${params}`;
  }

  const csrfToken: string = await __getCsrfToken(prefix);

  const res = await fetch(signInUrlWithParams, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      ...opts,
      csrfToken,
      callbackUrl,
    }),
  });

  const data = await res.clone().json();
  const error = data.url ? new URL(data.url).searchParams.get('error') : null;

  if (redirect !== false || !isSupportingReturn || !error) {
    window.location.assign(data.url ?? callbackUrl);

    if (data.url && data.url.includes('#')) {
      window.location.reload();
    }
    return;
  } else {
    return res;
  }
}

/**
 * Signs out the current user.
 *
 * @param options - Configuration options for the sign-out flow
 * @returns A Promise that resolves when the sign-out is complete
 * @throws {Error} When CSRF token fetch fails or returns invalid data
 * @throws {Error} When the sign-out endpoint returns a non-JSON response
 *
 * @example
 * ```ts
 * // Sign out and redirect to home
 * await signOut()
 *
 * // Sign out with custom callback URL
 * await signOut({ callbackUrl: '/login' })
 * ```
 */
export async function signOut(options?: AstroSignOutParams): Promise<void> {
  let callbackUrl = window.location.href;
  let prefix = '/api/auth';

  if (options) {
    if (options.callbackUrl) {
      callbackUrl = options.callbackUrl;
    }
    if (options.prefix) {
      prefix = options.prefix;
    }
  }

  const csrfToken: string = await __getCsrfToken(prefix);

  const res = await fetch(`${prefix}/signout`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl,
    }),
  });

  const data = await res.json();
  const url = data.url ?? callbackUrl;

  window.location.assign(url);

  if (url.includes('#')) {
    window.location.reload();
  }
}
