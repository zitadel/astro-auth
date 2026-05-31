// noinspection JSUnusedGlobalSymbols
/** @type {import('typedoc').TypeDocOptions} */
export default {
  entryPoints: [
    'src/index.ts',
    'src/client.ts',
    'src/server.ts',
    'src/adapter.ts',
    'src/types.ts',
    'src/components/index.ts',
  ],
  out: '.out/docs',
  tsconfig: './tsconfig.json',
  readme: 'README.md',
  projectDocuments: [
    'docs/guide/getting-started/introduction.md',
    'docs/guide/getting-started/installation.md',
    'docs/guide/authjs/quick-start.md',
    'docs/guide/authjs/astro-auth-handler.md',
    'docs/guide/authjs/custom-pages.md',
    'docs/guide/authjs/session-data.md',
    'docs/guide/authjs/server-side/session-access.md',
    'docs/guide/authjs/server-side/rest-api.md',
    'docs/guide/application-side/configuration.md',
    'docs/guide/application-side/protecting-pages.md',
    'docs/guide/application-side/session-access.md',
    'docs/guide/advanced/caching.md',
    'docs/guide/advanced/url-resolutions.md',
    'docs/guide/advanced/deployment/netlify.md',
    'docs/guide/advanced/deployment/vercel.md',
    'docs/guide/advanced/deployment/self-hosted.md',
  ],
  excludeInternal: true,
  excludePrivate: true,
  highlightLanguages: [
    'typescript',
    'javascript',
    'json',
    'astro',
    'jsx',
    'tsx',
    'bash',
    'sh',
    'html',
  ],
  externalSymbolLinkMappings: {
    oauth4webapi: {
      'TokenEndpointResponse.expires_in':
        'https://github.com/panva/oauth4webapi/blob/HEAD/docs/interfaces/TokenEndpointResponse.md',
      'TokenEndpointResponse.access_token':
        'https://github.com/panva/oauth4webapi/blob/HEAD/docs/interfaces/TokenEndpointResponse.md',
      'TokenEndpointResponse.refresh_token':
        'https://github.com/panva/oauth4webapi/blob/HEAD/docs/interfaces/TokenEndpointResponse.md',
    },
    '@auth/core': {
      'AuthConfig.adapter': 'https://authjs.dev/reference/core#adapter',
      'AuthConfig.session': 'https://authjs.dev/reference/core#session',
      JWT: 'https://authjs.dev/reference/core/jwt',
      'AuthConfig.logger': 'https://authjs.dev/guides/debugging#logging',
      'AuthConfig.debug': 'https://authjs.dev/guides/debugging',
      'AuthConfig.pages':
        'https://authjs.dev/getting-started/session-management/custom-pages',
      OAuthConfig: 'https://authjs.dev/reference/core/providers#oauthconfig',
      'OAuthConfig.profile':
        'https://authjs.dev/reference/core/providers#profile',
      CredentialsConfig:
        'https://authjs.dev/reference/core/providers/credentials',
      'CredentialsConfig.authorize':
        'https://authjs.dev/reference/core/providers/credentials#authorize',
      TokenSet: 'https://authjs.dev/reference/core/types#account',
      OAuth2Config: 'https://authjs.dev/reference/core/providers#oauth2config',
      'OAuth2Config.checks':
        'https://authjs.dev/reference/core/providers#checks',
    },
    '@auth/core/types': {
      'AuthConfig.adapter': 'https://authjs.dev/reference/core#adapter',
      'AuthConfig.session': 'https://authjs.dev/reference/core#session',
      JWT: 'https://authjs.dev/reference/core/jwt',
      'AuthConfig.logger': 'https://authjs.dev/guides/debugging#logging',
      'AuthConfig.debug': 'https://authjs.dev/guides/debugging',
      'AuthConfig.pages':
        'https://authjs.dev/getting-started/session-management/custom-pages',
      OAuthConfig: 'https://authjs.dev/reference/core/providers#oauthconfig',
      'OAuthConfig.profile':
        'https://authjs.dev/reference/core/providers#profile',
      CredentialsConfig:
        'https://authjs.dev/reference/core/providers/credentials',
      'CredentialsConfig.authorize':
        'https://authjs.dev/reference/core/providers/credentials#authorize',
      TokenSet: 'https://authjs.dev/reference/core/types#account',
      OAuth2Config: 'https://authjs.dev/reference/core/providers#oauth2config',
      'OAuth2Config.checks':
        'https://authjs.dev/reference/core/providers#checks',
    },
  },
  cleanOutputDir: true,
  treatWarningsAsErrors: false,
  validation: {
    invalidLink: true,
    notExported: true,
    notDocumented: false,
  },
};
