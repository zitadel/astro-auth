/**
 * @jest-environment jsdom
 */

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

const implSymbol = Reflect.ownKeys(window.location).find(
  (s) => s.toString() === 'Symbol(impl)',
)!;
const locationImpl = (window.location as any)[implSymbol];

let assignSpy: ReturnType<typeof jest.spyOn>;
let reloadSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  fetchMock.resetMocks();

  window.history.pushState(null, '', '/current-page');

  assignSpy = jest.spyOn(locationImpl, 'assign').mockImplementation(() => {});
  reloadSpy = jest.spyOn(locationImpl, 'reload').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('__getCsrfToken (private helper)', () => {
  it('should throw if fetch fails', async () => {
    fetchMock.mockReject(new Error('Network error'));
    await expect(signIn('github')).rejects.toThrow('Network error');
  });

  it('should throw if response is not ok', async () => {
    fetchMock.mockResponseOnce('', { status: 500 });
    await expect(signIn('github')).rejects.toThrow(
      'Failed to fetch CSRF token',
    );
  });

  it('should throw if response is not JSON', async () => {
    fetchMock.mockResponseOnce('<html>This is not JSON</html>');
    await expect(signIn('github')).rejects.toThrow(
      'CSRF endpoint returned non-JSON response',
    );
  });

  it('should throw if JSON has no token', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ some: 'data' }));
    await expect(signIn('github')).rejects.toThrow('Missing CSRF token');
  });
});

describe('signIn', () => {
  it('should sign in with an OAuth provider and redirect', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ csrfToken: 'token-123' }));
    fetchMock.mockResponseOnce(
      JSON.stringify({ url: 'http://localhost/dashboard' }),
    );

    await signIn('github');

    expect(fetchMock.mock.calls.length).toBe(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/csrf');

    const body = new URLSearchParams(
      fetchMock.mock.calls[1][1]?.body?.toString(),
    );
    expect(body.get('callbackUrl')).toBe('http://localhost/current-page');

    expect(assignSpy).toHaveBeenCalledWith('http://localhost/dashboard');
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('should use custom prefix, callbackUrl, and auth params', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ csrfToken: 'token-abc' }));
    fetchMock.mockResponseOnce(
      JSON.stringify({ url: 'http://localhost/custom-dash' }),
    );

    const options = {
      prefix: '/custom-api',
      callbackUrl: '/custom-dash',
    };
    const authParams = {
      login_hint: 'user@example.com',
    };

    await signIn('google', options, authParams);

    expect(assignSpy).toHaveBeenCalledWith('http://localhost/custom-dash');
  });

  it('should handle "credentials" provider with redirect: false', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ csrfToken: 'token-cred' }));
    const errorUrl = 'http://localhost/current-page?error=CredentialsSignin';
    fetchMock.mockResponseOnce(JSON.stringify({ url: errorUrl }));

    const options = { redirect: false };
    const authParams = { username: 'test' };

    const response = await signIn('credentials', options, authParams);

    expect(assignSpy).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();

    expect(response).toBeDefined();
    const data = await response?.json();
    expect(data.url).toBe(errorUrl);
  });

  it('should force reload if redirect URL contains a hash', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ csrfToken: 'token-hash' }));
    fetchMock.mockResponseOnce(
      JSON.stringify({ url: 'http://localhost/page#new-hash' }),
    );

    await signIn('github');

    expect(assignSpy).toHaveBeenCalledWith('http://localhost/page#new-hash');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('should not crash if response URL is null or undefined', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ csrfToken: 'token-null' }));
    fetchMock.mockResponseOnce(JSON.stringify({ url: null }));

    await signIn('github');

    expect(assignSpy).toHaveBeenCalledWith('http://localhost/current-page');
  });
});

describe('signOut', () => {
  it('should sign out and redirect', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ csrfToken: 'token-out' }));
    fetchMock.mockResponseOnce(
      JSON.stringify({ url: 'http://localhost/signed-out' }),
    );

    await signOut();

    expect(assignSpy).toHaveBeenCalledWith('http://localhost/signed-out');
  });

  it('should use custom prefix and callbackUrl', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ csrfToken: 'token-out-custom' }),
    );
    fetchMock.mockResponseOnce(JSON.stringify({ url: '/goodbye' }));

    await signOut({
      prefix: '/custom-api',
      callbackUrl: '/goodbye',
    });

    expect(assignSpy).toHaveBeenCalledWith('/goodbye');
  });

  it('should force reload if redirect URL contains a hash', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ csrfToken: 'token-hash' }));
    fetchMock.mockResponseOnce(
      JSON.stringify({ url: 'http://localhost/page#hash-on-signout' }),
    );

    await signOut();

    expect(assignSpy).toHaveBeenCalledWith(
      'http://localhost/page#hash-on-signout',
    );
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
