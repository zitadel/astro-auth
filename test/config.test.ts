import { describe, expect, it } from '@jest/globals';
import { defineConfig, virtualConfigModule } from '../src/config.js';

// Define a minimal mock context for testing the plugin's load function
interface MockPluginContext {
  resolve: (source: string) => Promise<{ id: string }>;
}

// Define a concrete Plugin interface for testing
interface TestPlugin {
  name: string;
  resolveId?: (id: string) => string | undefined;
  load?: (
    this: MockPluginContext,
    id: string,
  ) => Promise<string | undefined> | string | undefined;
}

describe('Config Module', () => {
  describe('defineConfig', () => {
    it('should return the config object with all values when provided', () => {
      const config = {
        providers: [],
        secret: 'my-secret',
        prefix: '/custom-auth',
        trustHost: true,
      };

      const result = defineConfig(config);

      expect(result.providers).toEqual([]);
      expect(result.secret).toBe('my-secret');
      expect(result.prefix).toBe('/custom-auth');
      expect(result.basePath).toBe('/custom-auth');
      expect(result.trustHost).toBe(true);
    });

    it('should set default prefix when not provided', () => {
      const config = {
        providers: [],
        secret: 'my-secret',
      };

      const result = defineConfig(config);

      expect(result.prefix).toBe('/api/auth');
      expect(result.basePath).toBe('/api/auth');
    });

    it('should set basePath to match prefix', () => {
      const config = {
        providers: [],
        secret: 'my-secret',
        prefix: '/custom-auth',
      };

      const result = defineConfig(config);

      expect(result.basePath).toBe('/custom-auth');
    });

    it('should preserve custom prefix when provided', () => {
      const config = {
        providers: [],
        secret: 'my-secret',
        prefix: '/my-auth',
      };

      const result = defineConfig(config);

      expect(result.prefix).toBe('/my-auth');
      expect(result.basePath).toBe('/my-auth');
    });

    it('should use secret from config over environment', () => {
      const config = {
        providers: [],
        secret: 'config-secret',
      };

      const result = defineConfig(config, { AUTH_SECRET: 'env-secret' });

      expect(result.secret).toBe('config-secret');
    });

    it('should use secret from environment when not in config', () => {
      const config = {
        providers: [],
      };

      const result = defineConfig(config, { AUTH_SECRET: 'env-secret' });

      expect(result.secret).toBe('env-secret');
    });

    it('should set trustHost from AUTH_TRUST_HOST env var', () => {
      const config = {
        providers: [],
      };

      const result = defineConfig(config, { AUTH_TRUST_HOST: 'true' });

      expect(result.trustHost).toBe(true);
    });

    it('should set trustHost when VERCEL env var is present', () => {
      const config = {
        providers: [],
      };

      const result = defineConfig(config, { VERCEL: '1' });

      expect(result.trustHost).toBe(true);
    });

    it('should set trustHost when CF_PAGES env var is present', () => {
      const config = {
        providers: [],
      };

      const result = defineConfig(config, { CF_PAGES: '1' });

      expect(result.trustHost).toBe(true);
    });

    it('should set trustHost to true in non-production NODE_ENV', () => {
      const config = {
        providers: [],
      };

      const result = defineConfig(config, { NODE_ENV: 'development' });

      expect(result.trustHost).toBe(true);
    });

    it('should not set trustHost in production NODE_ENV', () => {
      const config = {
        providers: [],
      };

      const result = defineConfig(config, { NODE_ENV: 'production' });

      expect(result.trustHost).toBe(false);
    });

    it('should preserve trustHost from config over environment', () => {
      const config = {
        providers: [],
        trustHost: false,
      };

      const result = defineConfig(config, { AUTH_TRUST_HOST: 'true' });

      expect(result.trustHost).toBe(false);
    });
  });

  describe('virtualConfigModule', () => {
    it('should return Vite plugin object with correct structure', () => {
      const plugin = virtualConfigModule() as TestPlugin;

      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('resolveId');
      expect(plugin).toHaveProperty('load');
      expect(plugin.name).toBe('astro-auth-config');
    });

    it('should use default config file path when not provided', async () => {
      const plugin = virtualConfigModule() as TestPlugin;
      const loadFn = plugin.load as (
        this: MockPluginContext,
        id: string,
      ) => Promise<string | undefined>;

      const result = await loadFn.call(
        { resolve: async (p: string) => ({ id: p }) },
        '\0auth:config',
      );

      expect(result).toContain('./auth.config');
    });

    it('should use custom config file path when provided', async () => {
      const plugin = virtualConfigModule('./custom/auth.ts') as TestPlugin;
      const loadFn = plugin.load as (
        this: MockPluginContext,
        id: string,
      ) => Promise<string | undefined>;

      const result = await loadFn.call(
        { resolve: async (p: string) => ({ id: p }) },
        '\0auth:config',
      );

      expect(result).toContain('./custom/auth.ts');
    });

    it('should resolve virtual module ID correctly', () => {
      const plugin = virtualConfigModule() as TestPlugin;
      const resolveIdFn = plugin.resolveId as (
        id: string,
      ) => string | undefined;

      const result = resolveIdFn('auth:config');

      expect(result).toBe('\0auth:config');
    });

    it('should not resolve non-virtual module IDs', () => {
      const plugin = virtualConfigModule() as TestPlugin;
      const resolveIdFn = plugin.resolveId as (
        id: string,
      ) => string | undefined;

      const result = resolveIdFn('some-other-module');

      expect(result).toBeUndefined();
    });

    it('should return import statement for virtual module', async () => {
      const plugin = virtualConfigModule('./my-auth.config') as TestPlugin;
      const loadFn = plugin.load as (
        this: MockPluginContext,
        id: string,
      ) => Promise<string | undefined>;

      const result = await loadFn.call(
        { resolve: async (p: string) => ({ id: p }) },
        '\0auth:config',
      );

      expect(result).toBe(
        'export { default as default } from "./my-auth.config";',
      );
    });

    it('should not load non-virtual module IDs', async () => {
      const plugin = virtualConfigModule() as TestPlugin;
      const loadFn = plugin.load as (
        this: MockPluginContext,
        id: string,
      ) => Promise<string | undefined>;

      const result = await loadFn.call(
        { resolve: async (p: string) => ({ id: p }) },
        'some-other-id',
      );

      expect(result).toBeUndefined();
    });
  });
});
