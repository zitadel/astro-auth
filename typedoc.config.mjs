// noinspection JSUnusedGlobalSymbols
export default {
  entryPoints: ['src/index.ts'],
  out: '.out/docs',
  readme: 'README.md',
  projectDocuments: [
    'docs/guide/getting-started/introduction.md',
    'docs/guide/authjs/quick-start.md',
    'docs/guide/application-side/configuration.md',
    'docs/guide/advanced/caching.md',
  ],
  highlightLanguages: [
    'typescript',
    'javascript',
    'json',
    'astro',
    'jsx',
    'bash',
    'sh',
    'html',
  ],
  externalSymbolLinkMappings: {
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
