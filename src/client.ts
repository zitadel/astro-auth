import type {
  AstroSignInOptions,
  AstroSignOutParams,
  LiteralUnion,
  SignInAuthorizationParams,
} from './types';

async function __getCsrfToken(prefix: string): Promise<string> {
  const res = await fetch(`${prefix}/csrf`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token (${res.status})`);
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

  callbackUrl = __normalizePathOnly(callbackUrl);

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

  let signInUrlWithParams: string;
  {
    const url = new URL(signInUrl, window.location.origin);
    if (authorizationParams) {
      for (const [k, v] of Object.entries(authorizationParams)) {
        url.searchParams.set(k, v);
      }
    }
    signInUrlWithParams = url.pathname + url.search;
  }

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

  let data: { url?: string } = {};
  try {
    data = await res.clone().json();
  } catch {
    // ignore non-JSON
  }
  const error = data.url ? new URL(data.url).searchParams.get('error') : null;

  if (redirect !== false || !isSupportingReturn || !error) {
    const candidate = data.url ?? (res.redirected ? res.url : undefined);
    const target = __safeRedirect(candidate, callbackUrl);
    window.location.assign(target);

    if (target && target.includes('#')) {
      window.location.reload();
    }
    return;
  } else {
    return res;
  }
}

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

  callbackUrl = __normalizePathOnly(callbackUrl);

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

  let data: { url?: string } = {};
  try {
    data = await res.json();
  } catch {
    // ignore non-JSON
  }
  const candidate = data.url ?? (res.redirected ? res.url : undefined);
  const url = __safeRedirect(candidate, callbackUrl);

  window.location.assign(url);

  if (url.includes('#')) {
    window.location.reload();
  }
}
