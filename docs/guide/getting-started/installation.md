---
title: Installation
group: Getting Started
---

# Installation

Install `@zitadel/astro-auth` and `@auth/core`:

```bash
# npm
npm install @zitadel/astro-auth @auth/core

# pnpm
pnpm add @zitadel/astro-auth @auth/core

# yarn
yarn add @zitadel/astro-auth @auth/core
```

Add the integration to your `astro.config.mjs`:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import authAstro from '@zitadel/astro-auth';

export default defineConfig({
  output: 'server',
  integrations: [authAstro()],
});
```

The integration auto-mounts the catch-all auth route at
`/api/auth/[...auth]`.
