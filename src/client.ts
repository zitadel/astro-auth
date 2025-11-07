import type {
  AstroSignInOptions,
  AstroSignOutParams,
  LiteralUnion,
  SignInAuthorizationParams,
} from './types.js';

async function __getCsrfToken(prefix: string): Promise<string> {
  const res = await fetch(`${prefix}/csrf`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token (${res.status})`);
  }
  const json: unknown = await res.json().catch(() => {
    throw new Error('CSRF endpoint returned non-JSON response');
  });
  const token = (json as { csrfToken?: string })?.csrfToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Missing or invalid CSRF token');
  }
  return token;
}

function __normalizePathOnly(href: string): string {
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin !== window.location.origin) {
      return (
        window.location.pathname + window.location.search + window.location.hash
      );
    }
    return u.pathname + u.search + u.hash;
  } catch {
    return (
      window.location.pathname + window.location.search + window.location.hash
    );
  }
}

function __safeRedirect(
  target: string | null | undefined,
  fallbackPathOnly: string,
): string {
  if (!target) return fallbackPathOnly;
  try {
    const u = new URL(target, window.location.origin);
    if (u.origin !== window.location.origin) return fallbackPathOnly;
    return u.href;
  } catch {
    return fallbackPathOnly;
  }
}

/**
 * Initiates a sign-in flow with the specified authentication provider.
 *
 * This function handles authentication for different provider types using
 * the appropriate mechanism for each. OAuth providers require browser form
 * submission to properly handle redirect chains, while credential-based
 * providers can use fetch for JSON responses.
 *
 * @typeParam P - The provider identifier type for type-safe provider names
 * @param providerId - The authentication provider identifier (e.g., 'github',
 *                     'google', 'credentials')
 * @param options - Configuration options for the sign-in flow
 * @param authorizationParams - Additional OAuth authorization parameters to
 *                              pass to the provider
 * @returns Promise that resolves to Response for credential providers when
 *          redirect is false and an error occurs, otherwise void
 *
 * @remarks
 * **Why Different Mechanisms for Different Providers:**
 *
 * OAuth Providers (github, google, etc.):
 * - Auth.js responds with a 302 redirect to the OAuth provider's login page
 * - Using `fetch()` causes the browser to follow redirects in JS context
 * - The OAuth provider expects a real browser navigation, not XHR
 * - Result: fetch completes but no visible navigation occurs
 * - Solution: Use real form submission to let browser handle redirects
 *
 * Credential/Email Providers:
 * - Auth.js responds with JSON containing success/error information
 * - These providers need to return Response objects for error handling
 * - Using `fetch()` allows access to response data and conditional redirects
 * - Result: Can detect errors and optionally suppress redirect
 * - Solution: Use fetch with JSON response handling
 *
 * **Security Considerations:**
 * - All requests include CSRF token protection
 * - Callback URLs are normalized to prevent open redirect attacks
 * - Only same-origin URLs are allowed for redirects
 *
 * **Browser Compatibility:**
 * - Form submission approach works in all browsers including those that
 *   restrict fetch() behavior for cross-origin redirects
 * - Hash-based navigation triggers explicit reload for proper routing
 *
 * @example OAuth Provider Sign-In
 * ```ts
 * // Triggers form submission and browser navigation to GitHub
 * await signIn('github')
 * ```
 *
 * @example OAuth with Custom Callback
 * ```ts
 * await signIn('google', {
 *   callbackUrl: '/dashboard'
 * })
 * ```
 *
 * @example OAuth with Authorization Parameters
 * ```ts
 * await signIn('google', undefined, {
 *   prompt: 'consent',
 *   login_hint: 'user@example.com'
 * })
 * ```
 *
 * @example Credential Provider with Error Handling
 * ```ts
 * const response = await signIn('credentials', {
 *   redirect: false
 * }, {
 *   username: 'user',
 *   password: 'pass'
 * })
 *
 * if (response) {
 *   const data = await response.json()
 *   if (data.error) {
 *     console.error('Sign in failed:', data.error)
 *   }
 * }
 * ```
 *
 * @public
 */
export async function signIn<P extends string | undefined = undefined>(
  providerId?: LiteralUnion<P extends string ? P | string : string>,
  options?: AstroSignInOptions,
  authorizationParams?: SignInAuthorizationParams,
): Promise<Response | void> {
  const initialCallbackUrl = options?.callbackUrl ?? window.location.href;
  const redirect = options?.redirect ?? true;

  const callbackUrl = __normalizePathOnly(initialCallbackUrl);

  const prefix = options?.prefix ?? '/api/auth';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { prefix: _p, callbackUrl: _c, redirect: _r, ...opts } = options ?? {};

  const isCredentials = providerId === 'credentials';
  const isEmail = providerId === 'email';
  const isSupportingReturn = isCredentials || isEmail;

  const signInUrl = isCredentials
    ? `${prefix}/callback/${providerId}`
    : `${prefix}/signin/${providerId}`;

  // ========================================================================
  // OAuth Provider Flow: Use Form Submission
  // ========================================================================
  // OAuth providers (GitHub, Google, etc.) require browser navigation to
  // follow the 302 redirect chain to the provider's authorization page.
  // Using fetch() keeps the redirect in JavaScript context, preventing the
  // actual navigation from occurring. Form submission allows the browser to
  // handle the redirect naturally.
  if (!isSupportingReturn) {
    const csrfToken: string = await __getCsrfToken(prefix);

    // Build the form action URL with authorization parameters
    const action = new URL(signInUrl, window.location.origin);
    if (authorizationParams) {
      for (const [k, v] of Object.entries(authorizationParams)) {
        action.searchParams.set(k, v);
      }
    }

    // Create a hidden form to submit the authentication request
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action.pathname + action.search;
    form.style.display = 'none';

    // Add required fields for Auth.js
    const fields: Record<string, string> = {
      csrfToken,
      callbackUrl,
      ...Object.fromEntries(
        Object.entries(opts).map(([k, v]) => [k, String(v)]),
      ),
    };

    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    return;
  }

  // ========================================================================
  // Credential/Email Provider Flow: Use Fetch
  // ========================================================================
  // Credential and email providers return JSON responses that may contain
  // error information. Using fetch() allows us to inspect the response and
  // conditionally handle redirects based on the redirect option and error
  // state. This enables the redirect: false pattern for error handling.

  const signInUrlWithParams = (() => {
    const url = new URL(signInUrl, window.location.origin);
    if (authorizationParams) {
      for (const [k, v] of Object.entries(authorizationParams)) {
        url.searchParams.set(k, v);
      }
    }
    return url.pathname + url.search;
  })();

  const csrfToken: string = await __getCsrfToken(prefix);

  const res = await fetch(signInUrlWithParams, {
    method: 'post',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      ...opts,
      csrfToken,
      callbackUrl,
    }),
  });

  const data: { url?: string } = await res
    .clone()
    .json()
    .catch(() => ({}));
  const error = data.url ? new URL(data.url).searchParams.get('error') : null;

  // Redirect unless explicitly disabled and an error occurred
  if (redirect !== false || !isSupportingReturn || !error) {
    const candidate = data.url ?? (res.redirected ? res.url : undefined);
    const target = __safeRedirect(candidate, callbackUrl);
    window.location.assign(target);

    // Force reload for hash-based navigation
    if (target && target.includes('#')) {
      window.location.reload();
    }
    return;
  } else {
    // Return response for error handling when redirect is false
    return res;
  }
}

export async function signOut(options?: AstroSignOutParams): Promise<void> {
  const initialCallbackUrl = options?.callbackUrl ?? window.location.href;
  const prefix = options?.prefix ?? '/api/auth';

  const callbackUrl = __normalizePathOnly(initialCallbackUrl);

  const csrfToken: string = await __getCsrfToken(prefix);

  const res = await fetch(`${prefix}/signout`, {
    method: 'post',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl,
    }),
  });

  const data: { url?: string } = await res.json().catch(() => ({}));
  const candidate = data.url ?? (res.redirected ? res.url : undefined);
  const url = __safeRedirect(candidate, callbackUrl);

  window.location.assign(url);

  if (url.includes('#')) {
    window.location.reload();
  }
}
