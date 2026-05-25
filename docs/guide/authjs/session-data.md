---
title: Session Data
group: OAuth Provider
---

# Customizing session data

OAuth gives you two callbacks for shaping what ends up in the session:
`jwt` and `session`. They're framework-agnostic — the SDK exposes them
through the auth config you pass to the factory.

## The jwt callback

The `jwt` callback fires whenever a session JWT is created or updated. Use
it to attach data from the OAuth provider (id_token, access_token, etc.) or
your database onto the token:

```ts
{
  callbacks: {
    async jwt({ token, account, user }) {
      // First sign-in: account + user are present
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ? account.expires_at * 1000 : null,
        };
      }
      return token;
    },
  },
}
```

## The session callback

The `session` callback shapes what `getSession()` returns to your app
code. The token from `jwt` is passed in; copy whatever fields you want
exposed to the client:

```ts
{
  callbacks: {
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      return session;
    },
  },
}
```

> **Warning:** Whatever you put on `session` is sent to the client (and
> rendered into HTML if you SSR the page). Do NOT put long-lived tokens,
> refresh tokens, or other secrets on the session unless you really mean to
> expose them.

## TypeScript types

Augment `Session` so your custom fields are type-safe:

```ts
declare module '@auth/core/types' {
  interface Session {
    accessToken?: string;
    idToken?: string;
  }
}
```

## Token refresh

The `jwt` callback also runs on subsequent reads. To refresh an expired
access token, check the expiry and call your refresh logic:

```ts
async jwt({ token }) {
  if (token.expiresAt && Date.now() < (token.expiresAt as number)) {
    return token;
  }
  return refreshAccessToken(token);
}
```
