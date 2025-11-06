/** @jest-environment jsdom */

import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';

import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

import { signIn, signOut } from '../src/client';

/**
 * Type definition for jest-fetch-mock's FetchMock.
 * We don't extend jest.Mock to avoid type compatibility issues.
 * Instead, we define just the properties we actually use.
 */
interface MockedFetch {
  mock: {
    calls: Array<[RequestInfo | URL, RequestInit?]>;
  };
  mockResponseOnce: (body: string, init?: ResponseInit) => MockedFetch;
  mockReject: (error: Error) => MockedFetch;
  resetMocks: () => void;
}

const typedFetchMock = fetchMock as unknown as MockedFetch;

/**
 * Interface for tracking form submissions in tests.
 * Captures form data when submit() is called since JSDOM doesn't implement it.
 */
interface FormSubmissionCapture {
  action: string;
  method: string;
  fields: Record<string, string>;
}

/**
 * Global storage for captured form submissions during tests.
 */
const capturedFormSubmissions: FormSubmissionCapture[] = [];

/**
 * Type-safe access to the internal location implementation.
 * JSDOM stores the actual location object in a Symbol property.
 */
interface LocationImpl {
  assign: (url: string) => void;
  reload: () => void;
}

/**
 * Helper to safely get the location implementation from JSDOM.
 */
function getLocationImpl(): LocationImpl {
  const implSymbol = Reflect.ownKeys(window.location).find(
    (s) => s.toString() === 'Symbol(impl)',
  );

  if (!implSymbol) {
    throw new Error('Could not find location implementation symbol');
  }

  const impl = (window.location as unknown as Record<symbol, unknown>)[
    implSymbol
  ];

  if (!impl || typeof impl !== 'object') {
    throw new Error('Location implementation not found');
  }

  return impl as LocationImpl;
}

let assignSpy: ReturnType<typeof jest.spyOn>;
let reloadSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  capturedFormSubmissions.length = 0;
  HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
    const formData = new FormData(this);
    const fields: Record<string, string> = {};
    formData.forEach((value, key) => {
      fields[key] = value.toString();
    });
    capturedFormSubmissions.push({
      action: this.action,
      method: this.method,
      fields,
    });
    this.remove();
  };

  typedFetchMock.resetMocks();
  window.history.pushState(null, '', '/current-page');

  const locationImpl = getLocationImpl();
  assignSpy = jest.spyOn(locationImpl, 'assign').mockImplementation(() => {});
  reloadSpy = jest.spyOn(locationImpl, 'reload').mockImplementation(() => {});
});

afterEach(() => {
  delete HTMLFormElement.prototype.submit;
  capturedFormSubmissions.length = 0;

  jest.restoreAllMocks();
});

describe('CSRF Token Handling', () => {
  it('should throw if fetch fails with network error', async () => {
    typedFetchMock.mockReject(new Error('Network error'));

    await expect(signIn('github')).rejects.toThrow('Network error');
  });

  it('should throw if CSRF endpoint returns non-200 status', async () => {
    typedFetchMock.mockResponseOnce('', { status: 500 });

    await expect(signIn('github')).rejects.toThrow(
      'Failed to fetch CSRF token',
    );
  });

  it('should throw if CSRF endpoint returns non-JSON response', async () => {
    typedFetchMock.mockResponseOnce('<html lang="en">This is not JSON</html>');

    await expect(signIn('github')).rejects.toThrow(
      'CSRF endpoint returned non-JSON response',
    );
  });

  it('should throw if CSRF response has no csrfToken field', async () => {
    typedFetchMock.mockResponseOnce(JSON.stringify({ some: 'data' }));

    await expect(signIn('github')).rejects.toThrow(
      'Missing or invalid CSRF token',
    );
  });

  it('should throw if CSRF token is empty string', async () => {
    typedFetchMock.mockResponseOnce(JSON.stringify({ csrfToken: '' }));

    await expect(signIn('github')).rejects.toThrow(
      'Missing or invalid CSRF token',
    );
  });
});

describe('signIn', () => {
  describe('OAuth Provider Flow', () => {
    it('should sign in with OAuth provider and redirect by default', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-123' }),
      );

      await signIn('github');

      expect(typedFetchMock.mock.calls).toHaveLength(1);
      expect(typedFetchMock.mock.calls[0]?.[0]).toBe('/api/auth/csrf');

      expect(capturedFormSubmissions).toHaveLength(1);
      const submission = capturedFormSubmissions[0];
      expect(submission?.action).toContain('/api/auth/signin/github');
      expect(submission?.method).toBe('post');
      expect(submission?.fields.csrfToken).toBe('token-123');
      expect(submission?.fields.callbackUrl).toBe('/current-page');
    });

    it('should use custom prefix for OAuth provider', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-abc' }),
      );

      await signIn('google', { prefix: '/custom-auth' });

      expect(typedFetchMock.mock.calls[0]?.[0]).toBe('/custom-auth/csrf');

      const submission = capturedFormSubmissions[0];
      expect(submission?.action).toContain('/custom-auth/signin/google');
    });

    it('should use custom callbackUrl', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-abc' }),
      );

      await signIn('google', { callbackUrl: '/custom-dash' });

      const submission = capturedFormSubmissions[0];
      expect(submission?.fields.callbackUrl).toBe('/custom-dash');
    });

    it('should append authorization params to signin URL', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-auth' }),
      );

      await signIn('google', undefined, {
        login_hint: 'user@example.com',
        prompt: 'consent',
      });

      const submission = capturedFormSubmissions[0];
      expect(submission?.action).toContain('login_hint=user%40example.com');
      expect(submission?.action).toContain('prompt=consent');
    });

    it('should pass through extra options to request body', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-extra' }),
      );

      await signIn('github', {
        callbackUrl: '/dashboard',
        // @ts-expect-error - testing runtime behavior with extra options
        customOption: 'customValue',
      });

      const submission = capturedFormSubmissions[0];
      expect(submission?.fields.customOption).toBe('customValue');
    });
  });

  describe('Credentials Provider Flow', () => {
    it('should use callback endpoint for credentials provider', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-cred' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/dashboard' }),
      );

      await signIn('credentials', undefined, {
        username: 'test',
        password: 'test123',
      });

      const signInUrl = typedFetchMock.mock.calls[1]?.[0] as string;
      expect(signInUrl).toContain('/api/auth/callback/credentials');
      expect(signInUrl).toContain('username=test');
      expect(signInUrl).toContain('password=test123');
    });

    it('should redirect by default even with credentials provider', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-cred' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/dashboard' }),
      );

      await signIn('credentials', { redirect: false });

      // Should redirect because there's no error in the URL
      expect(assignSpy).toHaveBeenCalledWith('http://localhost/dashboard');
    });

    it('should return response when redirect is false and error exists', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-cred' }),
      );
      const errorUrl = 'http://localhost/current-page?error=CredentialsSignin';
      typedFetchMock.mockResponseOnce(JSON.stringify({ url: errorUrl }));

      const response = await signIn(
        'credentials',
        { redirect: false },
        { username: 'test', password: 'wrong' },
      );

      expect(assignSpy).not.toHaveBeenCalled();
      expect(reloadSpy).not.toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);

      if (response) {
        const data = await response.json();
        expect(data?.url).toBe(errorUrl);
      }
    });

    it('should redirect even with redirect: false when no error', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-cred' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/dashboard' }),
      );

      await signIn('credentials', { redirect: false });

      expect(assignSpy).toHaveBeenCalledWith('http://localhost/dashboard');
    });
  });

  describe('Email Provider Flow', () => {
    it('should support email provider with same behavior as credentials', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-email' }),
      );
      const errorUrl = 'http://localhost/current-page?error=EmailSignin';
      typedFetchMock.mockResponseOnce(JSON.stringify({ url: errorUrl }));

      const response = await signIn(
        'email',
        { redirect: false },
        { email: 'test@example.com' },
      );

      expect(assignSpy).not.toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(response).toBeInstanceOf(Response);

      if (response) {
        const data = await response.json();
        expect(data?.url).toBe(errorUrl);
      }
    });

    it('should use signin endpoint for email provider', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-email' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/check-email' }),
      );

      await signIn('email', undefined, { email: 'test@example.com' });

      const signInUrl = typedFetchMock.mock.calls[1]?.[0] as string;
      expect(signInUrl).toContain('/api/auth/signin/email');
      expect(signInUrl).toContain('email=test%40example.com');
    });
  });

  describe('No Provider Flow', () => {
    it('should handle signIn with no provider specified', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-none' }),
      );

      await signIn();

      const submission = capturedFormSubmissions[0];
      expect(submission?.action).toContain('/api/auth/signin/undefined');
    });
  });

  describe('Edge Cases', () => {
    it('should handle when redirect option is explicitly true', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-true' }),
      );

      await signIn('github', { redirect: true });

      expect(capturedFormSubmissions).toHaveLength(1);
    });

    it('should use window.location.href as default callbackUrl', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-def' }),
      );

      await signIn('github');

      const submission = capturedFormSubmissions[0];
      expect(submission?.fields.callbackUrl).toBe('/current-page');
    });

    it('should handle empty options object', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-empty' }),
      );

      await signIn('github', {});

      expect(capturedFormSubmissions).toHaveLength(1);
    });
  });
});

describe('signOut', () => {
  describe('Basic Flow', () => {
    it('should sign out and redirect to response URL', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-out' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/signed-out' }),
      );

      await signOut();

      expect(typedFetchMock.mock.calls).toHaveLength(2);
      expect(typedFetchMock.mock.calls[0]?.[0]).toBe('/api/auth/csrf');
      expect(typedFetchMock.mock.calls[1]?.[0]).toBe('/api/auth/signout');

      const requestInit = typedFetchMock.mock.calls[1]?.[1];
      expect(requestInit?.method).toBe('post');
      expect(requestInit?.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Auth-Return-Redirect': '1',
        'X-Requested-With': 'XMLHttpRequest',
      });

      const bodyString = requestInit?.body?.toString() ?? '';
      const body = new URLSearchParams(bodyString);
      expect(body.get('csrfToken')).toBe('token-out');
      expect(body.get('callbackUrl')).toBe('/current-page');

      expect(assignSpy).toHaveBeenCalledWith('http://localhost/signed-out');
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('should use custom prefix', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-custom' }),
      );
      typedFetchMock.mockResponseOnce(JSON.stringify({ url: '/signout-page' }));

      await signOut({ prefix: '/custom-auth' });

      expect(typedFetchMock.mock.calls[0]?.[0]).toBe('/custom-auth/csrf');
      expect(typedFetchMock.mock.calls[1]?.[0]).toBe('/custom-auth/signout');
      expect(assignSpy).toHaveBeenCalledWith('http://localhost/signout-page');
    });

    it('should use custom callbackUrl', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-callback' }),
      );
      typedFetchMock.mockResponseOnce(JSON.stringify({ url: '/login' }));

      await signOut({ callbackUrl: '/goodbye' });

      const bodyString =
        typedFetchMock.mock.calls[1]?.[1]?.body?.toString() ?? '';
      const body = new URLSearchParams(bodyString);
      expect(body.get('callbackUrl')).toBe('/goodbye');

      expect(assignSpy).toHaveBeenCalledWith('http://localhost/login');
    });

    it('should combine custom prefix and callbackUrl', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-both' }),
      );
      typedFetchMock.mockResponseOnce(JSON.stringify({ url: '/goodbye' }));

      await signOut({
        prefix: '/custom-api',
        callbackUrl: '/goodbye',
      });

      expect(typedFetchMock.mock.calls[0]?.[0]).toBe('/custom-api/csrf');
      expect(typedFetchMock.mock.calls[1]?.[0]).toBe('/custom-api/signout');
      expect(assignSpy).toHaveBeenCalledWith('http://localhost/goodbye');
    });
  });

  describe('URL Hash Handling', () => {
    it('should force reload when URL contains hash', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-hash' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/page#section' }),
      );

      await signOut();

      expect(assignSpy).toHaveBeenCalledWith('http://localhost/page#section');
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('should not reload when URL has no hash', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-no' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/page' }),
      );

      await signOut();

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to callbackUrl when response url is null', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-null' }),
      );
      typedFetchMock.mockResponseOnce(JSON.stringify({ url: null }));

      await signOut();

      expect(assignSpy).toHaveBeenCalledWith('/current-page');
    });

    it('should fallback to callbackUrl when response url is undefined', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-undef' }),
      );
      typedFetchMock.mockResponseOnce(JSON.stringify({}));

      await signOut();

      expect(assignSpy).toHaveBeenCalledWith('/current-page');
    });

    it('should use custom callbackUrl as fallback', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-custom' }),
      );
      typedFetchMock.mockResponseOnce(JSON.stringify({ url: null }));

      await signOut({ callbackUrl: '/login' });

      expect(assignSpy).toHaveBeenCalledWith('/login');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options object', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-empty' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/signout' }),
      );

      await signOut({});

      expect(assignSpy).toHaveBeenCalledWith('http://localhost/signout');
    });

    it('should use window.location.href as default callbackUrl', async () => {
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ csrfToken: 'token-def' }),
      );
      typedFetchMock.mockResponseOnce(
        JSON.stringify({ url: 'http://localhost/signout' }),
      );

      await signOut();

      const bodyString =
        typedFetchMock.mock.calls[1]?.[1]?.body?.toString() ?? '';
      const body = new URLSearchParams(bodyString);
      expect(body.get('callbackUrl')).toBe('/current-page');
    });

    it('should throw error if CSRF token fetch fails', async () => {
      typedFetchMock.mockReject(new Error('Network failure'));

      await expect(signOut()).rejects.toThrow('Network failure');
      expect(assignSpy).not.toHaveBeenCalled();
    });
  });
});
