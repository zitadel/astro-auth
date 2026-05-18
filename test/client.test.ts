import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';

// The client module uses `window.location.href` at call time (not load time),
// so we can mock the global `window` object in Node.js without jsdom.
let locationHref = '';

beforeEach(() => {
  locationHref = '';
  (globalThis as Record<string, unknown>).window = {
    location: {
      get href() {
        return locationHref;
      },
      set href(url: string) {
        locationHref = url;
      },
    },
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
});

describe('Auth Client', () => {
  describe('signIn', () => {
    it('should set window.location.href to /api/auth/signin/{provider} when provider is given', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel');

      expect(locationHref).toBe('/api/auth/signin/zitadel');
    });

    it('should set window.location.href to /api/auth/signin when no provider is given', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn();

      expect(locationHref).toBe('/api/auth/signin');
    });

    it('should append callbackUrl as encoded query param when callbackUrl is provided with a provider', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel', { callbackUrl: '/dashboard' });

      expect(locationHref).toBe(
        '/api/auth/signin/zitadel?callbackUrl=%2Fdashboard',
      );
    });

    it('should append callbackUrl when no provider is given', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn(undefined, { callbackUrl: '/home' });

      expect(locationHref).toBe('/api/auth/signin?callbackUrl=%2Fhome');
    });

    it('should not append query string when callbackUrl is not provided', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel', {});

      expect(locationHref).toBe('/api/auth/signin/zitadel');
    });

    it('should encode special characters in callbackUrl', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel', { callbackUrl: '/path?foo=bar&baz=qux' });

      expect(locationHref).toBe(
        '/api/auth/signin/zitadel?callbackUrl=%2Fpath%3Ffoo%3Dbar%26baz%3Dqux',
      );
    });
  });

  describe('signOut', () => {
    it('should set window.location.href to /api/auth/signout', async () => {
      const { signOut } = await import('../src/client.js');

      await signOut();

      expect(locationHref).toBe('/api/auth/signout');
    });

    it('should append callbackUrl as encoded query param when provided', async () => {
      const { signOut } = await import('../src/client.js');

      await signOut({ callbackUrl: '/' });

      expect(locationHref).toBe('/api/auth/signout?callbackUrl=%2F');
    });

    it('should append callbackUrl for a nested path', async () => {
      const { signOut } = await import('../src/client.js');

      await signOut({ callbackUrl: '/goodbye' });

      expect(locationHref).toBe('/api/auth/signout?callbackUrl=%2Fgoodbye');
    });

    it('should not append query string when callbackUrl is not provided', async () => {
      const { signOut } = await import('../src/client.js');

      await signOut({});

      expect(locationHref).toBe('/api/auth/signout');
    });
  });

  describe('module exports', () => {
    it('should export signIn as a function', async () => {
      const { signIn } = await import('../src/client.js');

      expect(signIn).toBeDefined();
      expect(typeof signIn).toBe('function');
    });

    it('should export signOut as a function', async () => {
      const { signOut } = await import('../src/client.js');

      expect(signOut).toBeDefined();
      expect(typeof signOut).toBe('function');
    });
  });
});
