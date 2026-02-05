# Astro Auth.js

An [Astro](https://astro.build/) integration for [Auth.js](https://authjs.dev/)
that provides seamless authentication with multiple providers, session
management, and UI primitives that feel natural in Astro.

This integration brings the power and flexibility of Auth.js to Astro
applications with full TypeScript support, SSR-friendly HTTP handling,
and Astro-native patterns including integrations, endpoints, and components.

### Why?

Modern web applications require robust, secure, and flexible authentication
systems. While Auth.js provides excellent authentication capabilities,
integrating it with Astro applications requires careful consideration of
framework patterns, server-side rendering, and TypeScript integration.

However, a direct integration isn't always straightforward. Different types
of applications or deployment scenarios might warrant different approaches:

- **Framework Integration:** Auth.js operates at the HTTP level, while Astro
  uses integrations, endpoints, and components. A proper integration should bridge this
  gap by providing Astro-native primitives for authentication and authorization
  while maintaining the full Auth.js ecosystem compatibility.
- **HTTP Request Handling:** Astro’s server output and adapters (Node, Vercel, etc.)
  require clean request handling and route injection. Teams need a unified approach that
  maintains performance while providing seamless Auth.js integration.
- **Session and Request Lifecycle:** Proper session handling in Astro requires
  SSR-friendly utilities and components that work across server-rendered pages
  and client interactions.
- **Route Protection & UI:** Many applications need fine-grained authorization
  beyond simple authentication. This calls for cohesive building blocks: server utilities,
  client helpers, and drop-in UI components.

This integration, `@zitadel/astro-auth`, aims to provide the flexibility to
handle such scenarios. It allows you to leverage the full Auth.js ecosystem
while maintaining Astro best practices, ultimately leading to a more
effective and less burdensome authentication implementation.

## Installation

Install using NPM by using the following command:

```sh
npm install @zitadel/astro-auth @auth/core
```

## Usage

To use this integration, add the `@zitadel/astro-auth` integration to your Astro application.
The integration provides authentication infrastructure with configurable
endpoints, SSR utilities, and components.

You'll need to configure it with your Auth.js providers and options. The
integration will then be available throughout your application via Astro’s
integration system.

First, add the integration to your Astro config:

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import authAstro from '@zitadel/astro-auth';

export default defineConfig({
  output: 'server',
  integrations: [
    authAstro({
      // Optional:
      // prefix: '/api/auth',
      // configFile: './auth.config.ts'
    }),
  ],
});
```

```ts
// auth.config.ts
import { defineConfig } from '@zitadel/astro-auth';
import Google from '@auth/core/providers/google';

export default defineConfig({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
```

#### Using the Authentication System

The integration provides several functions and hooks for handling
authentication:

**Functions and Hooks:**

- `getSession(request, config?)`: Retrieves the current Auth.js session (SSR)
- `<Auth>`: Render-prop component that provides the current session to children
- `<SignIn provider="...">`: Drop-in button component for starting sign-in
- `<SignOut>`: Drop-in button component for signing out
- `signIn(provider, options?, authParams?)`: Client helper for programmatic sign-in
- `signOut(options?)`: Client helper for programmatic sign-out

**Basic Usage:**

```astro
---
// src/pages/index.astro
import { getSession } from '@zitadel/astro-auth/server';
import type { Session } from '@auth/core/types';

const session = await getSession(Astro.request);
---

<html>
  <body>
    {session ? (
      <>
        <p>Welcome {session.user?.name}</p>
        <a href="/api/auth/signout">Sign out</a>
      </>
    ) : (
      <a href="/api/auth/signin">Sign in</a>
    )}
  </body>
</html>
```

Prefer using components? Use the built-ins for a richer experience:

```astro
---
// src/pages/index.astro
import type { Session } from '@auth/core/types';
import { Auth, SignIn, SignOut } from '@zitadel/astro-auth/components';
---

<Auth>
  {(session: Session | null) => (
    <>
      {session ? (
        <>
          <SignOut>Sign out</SignOut>
          <p>Logged in as {session.user?.name}</p>
        </>
      ) : (
        <SignIn provider="github">Sign in with GitHub</SignIn>
      )}
    </>
  )}
</Auth>
```

Prefer client helpers? Use inline script tags:

```html
---
---

<html>
  <body>
    <button id="login">Login</button>
    <button id="logout">Logout</button>

    <script>
      const { signIn, signOut } = await import("@zitadel/astro-auth/client");
      document.querySelector("#login").onclick = () => signIn("github");
      document.querySelector("#logout").onclick = () => signOut();
    </script>
  </body>
</html>
```

##### Example: Advanced Configuration with Multiple Providers

This example shows how to use the integration with multiple Auth.js
providers and custom session configuration:

```ts
// auth.config.ts
import { defineConfig } from '@zitadel/astro-auth';
import Google from '@auth/core/providers/google';
import GitHub from '@auth/core/providers/github';

export default defineConfig({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).roles = (user as any).roles;
      return token;
    },
    async session({ session, token }) {
      (session.user as any).roles = (token as any).roles as
        | string[]
        | undefined;
      return session;
    },
  },
});
```

## Known Issues

- **SSR & Adapter Required:** The integration requires Astro’s server output
  with an adapter (e.g., `@astrojs/node`, Vercel, etc.). Ensure `output: 'server'`
  is set and an adapter is configured in `astro.config.mjs`.
- **Environment Configuration:** The integration relies on `AUTH_SECRET` and,
  in many hosting scenarios, `AUTH_TRUST_HOST`. Ensure these are correctly set
  in your environment for production.
- **Callback URLs:** OAuth providers must be configured with the correct
  callback URL: `[origin]/api/auth/callback/[provider]` (or your custom `prefix`).
- **Type Augmentation:** If you attach additional properties (e.g., roles) to
  the Auth.js user object, extend your app’s types accordingly so consumers of
  `session.user` remain type-safe.
- **Redirect Semantics:** OAuth providers expect real browser navigations during
  sign-in. The client helpers handle this for you—avoid manual `fetch()` calls
  to provider endpoints unless you know you need credential/email flows.

## Useful links

- **[Auth.js](https://authjs.dev/):** The authentication library that this
  integration is built upon.
- **[Astro](https://astro.build/):** The framework this integration targets.
- **[Auth.js Providers](https://authjs.dev/getting-started/providers):**
  Complete list of supported authentication providers.

## Contributing

If you have suggestions for how this integration could be improved, or
want to report a bug, open an issue - we'd love all and any
contributions.

## License

Apache-2.0
