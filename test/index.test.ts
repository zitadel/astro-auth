import { describe, expect, it } from '@jest/globals';

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

    it('should not export components from main entry', async () => {
      const module = await import('../src/index');

      expect(module).not.toHaveProperty('Auth');
      expect(module).not.toHaveProperty('SignIn');
      expect(module).not.toHaveProperty('SignOut');
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

    it('should return AstroIntegration object', async () => {
      const integration = await import('../src/integration');
      const result = integration.default();

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('hooks');
      expect(result.name).toBe('astro-auth');
    });
  });
});
