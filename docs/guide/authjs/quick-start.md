---
title: Quick Start
group: Auth.js Provider
children:
  - ./session-data.md
  - ./custom-pages.md
  - ./server-side/session-access.md
  - ./server-side/rest-api.md
---

# Auth.js Quick Start

This guide walks through setting up `@zitadel/astro-auth` with the Auth.js
provider, suitable for OAuth, magic links, and credentials sign-in.

## Installation

Install `@auth/core` alongside `@zitadel/astro-auth`:

```bash
npm install @zitadel/astro-auth @auth/core
```

## Add the integration

In `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import authAstro from '@zitadel/astro-auth';

export default defineConfig({
  output: 'server',
  integrations: [authAstro()],
});
```

## Configure AstroAuth

Create `auth.config.ts` at the project root:

```ts
// auth.config.ts
import { defineConfig } from '@zitadel/astro-auth';
import GitHub from '@auth/core/providers/github';

export default defineConfig({
  secret: import.meta.env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: import.meta.env.GITHUB_ID,
      clientSecret: import.meta.env.GITHUB_SECRET,
    }),
  ],
});
```

The integration auto-mounts the Auth.js REST endpoints under `/api/auth/*`.

## Set the secret

The `secret` is used to sign + encrypt session JWTs. In production this MUST
be set:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set it as `AUTH_SECRET` in your environment.

## Next Steps

- [Customize session data](./session-data.md)
- [Override the default auth pages](./custom-pages.md)
- [Access the session server-side](./server-side/session-access.md)
