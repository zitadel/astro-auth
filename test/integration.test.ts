import { describe, expect, it, jest } from '@jest/globals';
import type {
  AstroIntegration,
  AstroConfig,
  InjectedRoute,
  AstroIntegrationLogger,
} from 'astro';
import authIntegration from '../src/integration';

function createMockAdapter(name: string = '@astrojs/node') {
  return {
    name,
    serverEntrypoint: `${name}/server.js`,
    exports: ['handler'],
    supportedAstroFeatures: {},
    hooks: {},
  };
}

function createMockAstroConfig(
  overrides: Partial<AstroConfig> = {},
): AstroConfig {
  return {
    root: new URL('file:///test/'),
    srcDir: new URL('file:///test/src/'),
    publicDir: new URL('file:///test/public/'),
    outDir: new URL('file:///test/dist/'),
    cacheDir: new URL('file:///test/.astro/'),
    build: {
      format: 'directory',
      client: new URL('file:///test/dist/client/'),
      server: new URL('file:///test/dist/server/'),
      assets: '_astro',
      serverEntry: 'entry.mjs',
      redirects: true,
      inlineStylesheets: 'auto',
    },
    server: {
      host: false,
      port: 4321,
      open: false,
    },
    integrations: [],
    adapter: createMockAdapter(),
    ...overrides,
  } as AstroConfig;
}

async function runIntegrationSetup(
  integration: AstroIntegration,
  astroConfig: Partial<AstroConfig> = {},
): Promise<{
  injectedRoutes: InjectedRoute[];
  viteConfigs: AstroConfig[];
}> {
  const injectedRoutes: InjectedRoute[] = [];
  const viteConfigs: AstroConfig[] = [];

  const config = createMockAstroConfig(astroConfig);

  const context = {
    config,
    command: 'dev' as 'dev' | 'build' | 'preview' | 'sync',
    isRestart: false,
    addRenderer: jest.fn(),
    addWatchFile: jest.fn(),
    addDevIframe: jest.fn(),
    addIcon: jest.fn(),
    injectScript: jest.fn(),
    injectDSO: jest.fn(),
    logger: {
      options: {
        dest: {
          write: jest.fn(() => true),
        },
        level: 'info' as 'debug' | 'info' | 'warn' | 'error' | 'silent',
      },
      label: 'mock-integration',
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
      fork: jest.fn(),
    } as AstroIntegrationLogger,
    injectRoute: (route: InjectedRoute) => {
      injectedRoutes.push(route);
    },
    updateConfig: (newConfig: AstroConfig) => {
      viteConfigs.push(newConfig);
      Object.assign(config, newConfig);
      return config;
    },
    addClientDirective: jest.fn(),
    addDevToolbarApp: jest.fn(),
    addMiddleware: jest.fn(),
    createCodegenDir: jest.fn(() => new URL('file:///test/.astro/codegen/')),
  };

  if (integration.hooks && integration.hooks['astro:config:setup']) {
    await integration.hooks['astro:config:setup'](context);
  }

  return { injectedRoutes, viteConfigs };
}

describe('Integration Module', () => {
  describe('Integration Structure', () => {
    it('should return an AstroIntegration object', () => {
      const integration = authIntegration();

      expect(integration).toHaveProperty('name');
      expect(integration).toHaveProperty('hooks');
      expect(integration.name).toBe('astro-auth');
    });

    it('should have astro:config:setup hook', () => {
      const integration = authIntegration();

      expect(integration.hooks).toHaveProperty('astro:config:setup');
      expect(typeof integration.hooks['astro:config:setup']).toBe('function');
    });

    it('should accept empty options', () => {
      const integration = authIntegration();

      expect(integration).toBeDefined();
      expect(integration.name).toBe('astro-auth');
    });

    it('should accept configuration options', () => {
      const integration = authIntegration({
        prefix: '/custom-auth',
        configFile: './custom-config.ts',
        injectEndpoints: false,
      });

      expect(integration).toBeDefined();
      expect(integration.name).toBe('astro-auth');
    });
  });

  describe('Adapter Validation', () => {
    it('should throw error when no adapter is configured', async () => {
      const integration = authIntegration();

      await expect(
        runIntegrationSetup(integration, { adapter: undefined }),
      ).rejects.toThrow(
        'No adapter found. Authentication requires server-side rendering. Please add an adapter to your Astro config.',
      );
    });

    it('should not throw when adapter is configured', async () => {
      const integration = authIntegration();

      await expect(runIntegrationSetup(integration)).resolves.not.toThrow();
    });
  });

  describe('Default Configuration', () => {
    it('should use default prefix /api/auth', async () => {
      const integration = authIntegration();
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('/api/auth/[...auth]');
    });

    it('should inject routes by default', async () => {
      const integration = authIntegration();
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
    });

    it('should configure Vite with virtual config module', async () => {
      const integration = authIntegration();
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs).toHaveLength(1);
      expect(viteConfigs[0]).toHaveProperty('vite');
      expect(viteConfigs[0].vite).toHaveProperty('plugins');
      expect(viteConfigs[0].vite).toHaveProperty('optimizeDeps');
    });

    it('should exclude auth:config from Vite optimizeDeps', async () => {
      const integration = authIntegration();
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs[0].vite?.optimizeDeps).toHaveProperty('exclude');
      expect(viteConfigs[0].vite?.optimizeDeps?.exclude).toContain(
        'auth:config',
      );
    });
  });

  describe('Custom Prefix Configuration', () => {
    it('should use custom prefix when provided', async () => {
      const integration = authIntegration({ prefix: '/custom-auth' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('/custom-auth/[...auth]');
    });

    it('should handle prefix without leading slash', async () => {
      const integration = authIntegration({ prefix: 'auth' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('auth/[...auth]');
    });

    it('should handle prefix with trailing slash', async () => {
      const integration = authIntegration({ prefix: '/api/auth/' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('/api/auth//[...auth]');
    });

    it('should handle root prefix', async () => {
      const integration = authIntegration({ prefix: '/' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('//[...auth]');
    });

    it('should handle deep nested prefix', async () => {
      const integration = authIntegration({ prefix: '/api/v1/authentication' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe(
        '/api/v1/authentication/[...auth]',
      );
    });
  });

  describe('Route Injection Control', () => {
    it('should inject routes when injectEndpoints is true', async () => {
      const integration = authIntegration({ injectEndpoints: true });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
    });

    it('should inject routes when injectEndpoints is undefined (default)', async () => {
      const integration = authIntegration({});
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
    });

    it('should not inject routes when injectEndpoints is false', async () => {
      const integration = authIntegration({ injectEndpoints: false });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(0);
    });

    it('should still configure Vite when routes not injected', async () => {
      const integration = authIntegration({ injectEndpoints: false });
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs).toHaveLength(1);
      expect(viteConfigs[0].vite).toBeDefined();
    });
  });

  describe('Route Entrypoint', () => {
    it('should inject route with correct entrypoint', async () => {
      const integration = authIntegration();
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes[0].entrypoint).toBeDefined();
      expect(injectedRoutes[0].entrypoint).toContain('[...auth].js');
    });

    it('should resolve entrypoint to an absolute path', async () => {
      const integration = authIntegration();
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes[0].entrypoint).toMatch(/^\//);
    });

    it('should point to api directory', async () => {
      const integration = authIntegration();
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes[0].entrypoint).toContain('/api/');
    });
  });

  describe('Config File Configuration', () => {
    it('should use default config file path', async () => {
      const integration = authIntegration();
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs[0].vite?.plugins).toBeDefined();
      expect(Array.isArray(viteConfigs[0].vite?.plugins)).toBe(true);
      expect(viteConfigs[0].vite?.plugins?.length).toBeGreaterThan(0);
    });

    it('should accept custom config file path', async () => {
      const integration = authIntegration({
        configFile: './config/custom-auth.ts',
      });
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs[0].vite?.plugins).toBeDefined();
      expect(Array.isArray(viteConfigs[0].vite?.plugins)).toBe(true);
    });

    it('should handle relative config file paths', async () => {
      const integration = authIntegration({
        configFile: '../config/auth.ts',
      });
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs[0].vite?.plugins).toBeDefined();
    });

    it('should handle absolute-looking config file paths', async () => {
      const integration = authIntegration({
        configFile: '/absolute/path/auth.ts',
      });
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs[0].vite?.plugins).toBeDefined();
    });
  });

  describe('Vite Configuration', () => {
    it('should configure exactly one Vite plugin', async () => {
      const integration = authIntegration();
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs).toHaveLength(1);
    });

    it('should have plugins array in Vite config', async () => {
      const integration = authIntegration();
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs[0].vite?.plugins).toBeDefined();
      expect(Array.isArray(viteConfigs[0].vite?.plugins)).toBe(true);
    });

    it('should have optimizeDeps configuration', async () => {
      const integration = authIntegration();
      const { viteConfigs } = await runIntegrationSetup(integration);

      expect(viteConfigs[0].vite?.optimizeDeps).toBeDefined();
      expect(viteConfigs[0].vite?.optimizeDeps).toHaveProperty('exclude');
    });

    it('should only exclude auth:config from optimizeDeps', async () => {
      const integration = authIntegration();
      const { viteConfigs } = await runIntegrationSetup(integration);

      const exclude = viteConfigs[0].vite?.optimizeDeps?.exclude;
      expect(Array.isArray(exclude)).toBe(true);
      expect(exclude).toHaveLength(1);
      expect(exclude).toContain('auth:config');
    });
  });

  describe('Combined Configuration Options', () => {
    it('should handle all options together', async () => {
      const integration = authIntegration({
        prefix: '/auth',
        configFile: './my-auth.config.ts',
        injectEndpoints: true,
      });
      const { injectedRoutes, viteConfigs } =
        await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('/auth/[...auth]');
      expect(viteConfigs).toHaveLength(1);
    });

    it('should handle partial options', async () => {
      const integration = authIntegration({
        prefix: '/auth',
      });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('/auth/[...auth]');
    });

    it('should handle different combinations of options', async () => {
      const integration = authIntegration({
        configFile: './custom.ts',
        injectEndpoints: false,
      });
      const { injectedRoutes, viteConfigs } =
        await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(0);
      expect(viteConfigs).toHaveLength(1);
    });
  });

  describe('Integration Behavior with Different Adapters', () => {
    it('should work with node adapter', async () => {
      const integration = authIntegration();
      const config = {
        adapter: createMockAdapter('@astrojs/node'),
      };

      await expect(
        runIntegrationSetup(integration, config),
      ).resolves.not.toThrow();
    });

    it('should work with vercel adapter', async () => {
      const integration = authIntegration();
      const config = {
        adapter: createMockAdapter('@astrojs/vercel'),
      };

      await expect(
        runIntegrationSetup(integration, config),
      ).resolves.not.toThrow();
    });

    it('should work with netlify adapter', async () => {
      const integration = authIntegration();
      const config = {
        adapter: createMockAdapter('@astrojs/netlify'),
      };

      await expect(
        runIntegrationSetup(integration, config),
      ).resolves.not.toThrow();
    });

    it('should work with cloudflare adapter', async () => {
      const integration = authIntegration();
      const config = {
        adapter: createMockAdapter('@astrojs/cloudflare'),
      };

      await expect(
        runIntegrationSetup(integration, config),
      ).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string prefix', async () => {
      const integration = authIntegration({ prefix: '' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('/[...auth]');
    });

    it('should handle whitespace in prefix', async () => {
      const integration = authIntegration({ prefix: ' /api/auth ' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe(' /api/auth /[...auth]');
    });

    it('should handle special characters in prefix', async () => {
      const integration = authIntegration({ prefix: '/api-v2/auth_service' });
      const { injectedRoutes } = await runIntegrationSetup(integration);

      expect(injectedRoutes).toHaveLength(1);
      expect(injectedRoutes[0].pattern).toBe('/api-v2/auth_service/[...auth]');
    });

    it('should not modify config object passed to it', async () => {
      const config = { prefix: '/auth' };
      const configCopy = { ...config };

      authIntegration(config);

      expect(config).toEqual(configCopy);
    });
  });

  describe('Multiple Integration Instances', () => {
    it('should create independent integrations', () => {
      const integration1 = authIntegration({ prefix: '/auth1' });
      const integration2 = authIntegration({ prefix: '/auth2' });

      expect(integration1).not.toBe(integration2);
      expect(integration1.name).toBe(integration2.name);
    });

    it('should allow multiple integrations with different configs', async () => {
      const integration1 = authIntegration({ prefix: '/auth1' });
      const integration2 = authIntegration({ prefix: '/auth2' });

      const result1 = await runIntegrationSetup(integration1);
      const result2 = await runIntegrationSetup(integration2);

      expect(result1.injectedRoutes[0].pattern).toBe('/auth1/[...auth]');
      expect(result2.injectedRoutes[0].pattern).toBe('/auth2/[...auth]');
    });
  });

  describe('Hook Execution Order', () => {
    it('should call updateConfig before checking for routes', async () => {
      const integration = authIntegration();
      const callOrder: string[] = [];
      const config = createMockAstroConfig();

      const context = {
        config,
        command: 'dev' as 'dev' | 'build' | 'preview' | 'sync',
        isRestart: false,
        addRenderer: jest.fn(),
        addWatchFile: jest.fn(),
        addDevIframe: jest.fn(),
        addIcon: jest.fn(),
        injectScript: jest.fn(),
        injectDSO: jest.fn(),
        logger: {
          options: {
            dest: {
              write: jest.fn(() => true),
            },
            level: 'info' as 'debug' | 'info' | 'warn' | 'error' | 'silent',
          },
          label: 'mock-integration',
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
          fatal: jest.fn(),
          fork: jest.fn(),
        } as AstroIntegrationLogger,
        injectRoute: () => {
          callOrder.push('injectRoute');
        },
        updateConfig: (newConfig: AstroConfig) => {
          callOrder.push('updateConfig');
          Object.assign(config, newConfig);
          return config;
        },
        addClientDirective: jest.fn(),
        addDevToolbarApp: jest.fn(),
        addMiddleware: jest.fn(),
        createCodegenDir: jest.fn(
          () => new URL('file:///test/.astro/codegen/'),
        ),
      };

      if (integration.hooks?.['astro:config:setup']) {
        await integration.hooks['astro:config:setup'](context);
      }

      expect(callOrder[0]).toBe('updateConfig');
      expect(callOrder[1]).toBe('injectRoute');
    });
  });
});
