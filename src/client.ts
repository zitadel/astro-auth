import type {
  AstroSignInOptions,
  AstroSignOutParams,
  LiteralUnion,
  SignInAuthorizationParams,
} from './types.ts';

/**
 * Initiates a sign-in flow for the specified authentication provider.
 *
 * This client-side function handles the complete sign-in process, including
 * CSRF token management, provider-specific routing, and post-authentication
 * redirects. It automatically adds the CSRF token to prevent cross-site
 * request forgery attacks.
 *
 * @param providerId - The authentication provider identifier (e.g., 'github',
 *   'google', 'credentials')
 * @param options - Configuration options for the sign-in flow
 * @param authorizationParams - Additional parameters to pass to the OAuth
 *   provider
 * @returns Promise resolving to the fetch Response, or void if redirecting
 *
 * @throws {Error} When CSRF token retrieval fails
 *
 * @example Basic usage with OAuth provider
 * ```ts
 * await signIn('github')
 * ```
 *
 * @example With custom callback URL
 * ```ts
 * await signIn('google', {
 *   callbackUrl: '/dashboard',
 *   redirect: true
 * })
 * ```
 *
 * @example With custom base path
 * ```ts
 * await signIn('github', {
 *   prefix: '/custom-auth'
 * })
 * ```
 *
 * @example Credentials provider without redirect
 * ```ts
 * const response = await signIn('credentials', {
 *   redirect: false
 * }, {
 *   email: 'user@example.com',
 *   password: 'password123'
 * })
 * ```
 *
 * @see {@link https://authjs.dev/reference/utilities#signin | Auth.js signIn Documentation}
 *
 * @public
 */
export async function signIn<P extends string | undefined = undefined>(
  providerId?: LiteralUnion<P extends string ? P | string : string>,
  options?: AstroSignInOptions,
  authorizationParams?: SignInAuthorizationParams,
) {
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
    // Extract non-prefix options
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

  // Retrieve CSRF token for request protection
  const csrfTokenResponse = await fetch(`${prefix}/csrf`);
  const { csrfToken } = await csrfTokenResponse.json();

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
  const error = new URL(data.url).searchParams.get('error');

  if (redirect || !isSupportingReturn || !error) {
    window.location.href = data.url ?? callbackUrl;

    // Force reload if URL contains hash (browser doesn't auto-reload)
    if (data.url && data.url.includes('#')) {
      window.location.reload();
    }
    return;
  } else {
    return res;
  }
}

/**
 * Signs the user out by removing the session cookie.
 *
 * This client-side function handles the complete sign-out process, including
 * CSRF token management and post-signout redirects. It automatically adds
 * the CSRF token to prevent cross-site request forgery attacks.
 *
 * @param options - Configuration options for the sign-out flow
 * @returns Promise that resolves when sign-out is complete
 *
 * @throws {Error} When CSRF token retrieval fails
 *
 * @example Basic usage
 * ```ts
 * await signOut()
 * ```
 *
 * @example With custom callback URL
 * ```ts
 * await signOut({
 *   callbackUrl: '/login'
 * })
 * ```
 *
 * @example With custom base path
 * ```ts
 * await signOut({
 *   prefix: '/custom-auth'
 * })
 * ```
 *
 * @see {@link https://authjs.dev/reference/utilities#signout | Auth.js signOut Documentation}
 *
 * @public
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

  // Retrieve CSRF token for request protection
  const csrfTokenResponse = await fetch(`${prefix}/csrf`);
  const { csrfToken } = await csrfTokenResponse.json();

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

  window.location.href = url;

  // Force reload if URL contains hash (browser doesn't auto-reload)
  if (url.includes('#')) {
    window.location.reload();
  }
}
