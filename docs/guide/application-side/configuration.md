---
title: Configuration
group: Application Side
children:
  - ./protecting-pages.md
  - ./session-access.md
---

# Factory Configuration

The SDK's factory accepts an `AuthConfig` from `@auth/core`. The full
shape is documented in the [OAuth
reference](https://authjs.dev/reference/core). The most-used keys are
below.

## `secret`

- **Type**: `string`
- **Required**: in production

A 32+ byte random string used to sign and encrypt session JWTs.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set via `AUTH_SECRET` env var or pass directly.

## `providers`

- **Type**: `Provider[]`

The list of authentication providers (OAuth, credentials, email magic
links). Import providers from `@auth/core/providers/*`.

```ts
import GitHub from '@auth/core/providers/github';
import Zitadel from '@auth/core/providers/zitadel';

providers: [
  GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }),
  Zitadel({ issuer: process.env.ZITADEL_DOMAIN, clientId: process.env.ZITADEL_CLIENT_ID }),
]
```

## `pages`

- **Type**: `{ signIn?: string; signOut?: string; error?: string; ... }`

Override the default OAuth pages with your own routes:

```ts
pages: {
  signIn: '/auth/login',
  error: '/auth/error',
}
```

## `session`

- **Type**: `{ strategy?: 'jwt' | 'database'; maxAge?: number }`

Session storage strategy. Default is `jwt`. `maxAge` is in seconds.

```ts
session: {
  strategy: 'jwt',
  maxAge: 3600, // 1 hour
}
```

## `callbacks`

- **Type**: `{ jwt?, session?, signIn?, redirect? }`

Lifecycle hooks. See [Session Data](../authjs/session-data.md) for the
common `jwt` + `session` callback patterns.

## `trustHost`

- **Type**: `boolean`

If `true`, OAuth trusts `X-Forwarded-Host` / `Host` headers when computing
URLs. Only enable when your hosting platform's proxy headers are
trustworthy.

## `basePath`

- **Type**: `string`
- **Default**: `/api/auth`

The base path the auth handler is mounted at. Change only if you've mounted
the catch-all route at a non-default path.
