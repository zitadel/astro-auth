import type {
  AstroSignInOptions,
  AstroSignOutParams,
  LiteralUnion,
  SignInAuthorizationParams,
} from './types';

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
  if (!token) {
    throw new Error('Missing CSRF token');
  }
  return token;
}

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
  if (!csrfToken) {
    throw new Error('Missing CSRF token');
  }

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

  if (redirect || !isSupportingReturn || !error) {
    window.location.assign(data.url ?? callbackUrl);

    if (data.url && data.url.includes('#')) {
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

  const csrfToken: string = await __getCsrfToken(prefix);
  if (!csrfToken) {
    throw new Error('Missing CSRF token');
  }

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
