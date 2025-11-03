import { describe, expect, it, jest } from '@jest/globals';

// --- Mock for the virtual 'auth:config' module ---
// This mock is used by any module (like src/server) imported by these tests.
jest.mock('auth:config', () => ({
  __esModule: true, // This is important for ES Module mocks
  default: {
    prefix: '/api/auth',
    injectEndpoints: true,
    // Add any other default config properties your tests might need
  },
}));
// -------------------------------------------------

describe('Package Exports', () => {
  describe('Main Entry Point', () => {
    it('should export default integration function', async () => {
      const module = await import('../src/index');

      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });

    it('should export defineConfig function', async () => {
      const { defineConfig } = await import('../src/index');

      expect(defineConfig).toBeDefined();
      expect(typeof defineConfig).toBe('function');
    });

    it('should export Auth component', async () => {
      const { Auth } = await import('../src/index');

      expect(Auth).toBeDefined();
    });

    it('should export SignIn component', async () => {
      const { SignIn } = await import('../src/index');

      expect(SignIn).toBeDefined();
    });

    it('should export SignOut component', async () => {
      const { SignOut } = await import('../src/index');

      expect(SignOut).toBeDefined();
    });
  });

  describe('Client Entry Point', () => {
    it('should export signIn function', async () => {
      const { signIn } = await import('../src/client');

      expect(signIn).toBeDefined();
      expect(typeof signIn).toBe('function');
    });

    it('should export signOut function', async () => {
      const { signOut } = await import('../src/client');

      expect(signOut).toBeDefined();
      expect(typeof signOut).toBe('function');
    });
  });

  describe('Server Entry Point', () => {
    it('should export AstroAuth function', async () => {
      const { AstroAuth } = await import('../src/server');

      expect(AstroAuth).toBeDefined();
      expect(typeof AstroAuth).toBe('function');
    });

    it('should export getSession function', async () => {
      const { getSession } = await import('../src/server');

      expect(getSession).toBeDefined();
      expect(typeof getSession).toBe('function');
    });
  });

  describe('Types Entry Point', () => {
    it('should have all type exports available', async () => {
      const types = await import('../src/types');

      expect(types).toBeDefined();
    });
  });

  describe('Config Entry Point', () => {
    it('should export defineConfig function', async () => {
      const { defineConfig } = await import('../src/config');

      expect(defineConfig).toBeDefined();
      expect(typeof defineConfig).toBe('function');
    });

    it('should export virtualConfigModule function', async () => {
      const { virtualConfigModule } = await import('../src/config');

      expect(virtualConfigModule).toBeDefined();
      expect(typeof virtualConfigModule).toBe('function');
    });
  });

  describe('Integration Entry Point', () => {
    it('should export default integration function', async () => {
      const integration = await import('../src/integration');

      expect(integration.default).toBeDefined();
      expect(typeof integration.default).toBe('function');
    });

    // --- THIS IS THE FIXED TEST ---
    it('should return AstroIntegration object', async () => {
      // Changed from 'require' to 'await import'
      const integration = await import('../src/integration');
      const result = integration.default(); // Access the default export

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('hooks');
      expect(result.name).toBe('astro-auth');
    });
  });
});
