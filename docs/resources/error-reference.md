---
title: Error Reference
group: Resources
---

# Errors and warnings

This is a list of errors & warnings that the SDK throws, what each of them
means and how you can resolve them.

## AUTH_NO_SECRET

`AUTH_NO_SECRET` appears as a warning during development and is thrown as an
error that stops the application during production. It is safe to ignore the
development warning — it is only a heads-up for your later production
deployment. `AUTH_NO_SECRET` occurs when no `secret` was set in the auth
configuration:

```ts
{
  secret: 'my-superb-secret', // This is missing
  // ... rest of your config
}
```

You can also set the `AUTH_SECRET` environment variable instead of passing
`secret` directly.

## AUTH_NO_ORIGIN

`AUTH_NO_ORIGIN` appears as a warning during development and is thrown as an
error that stops the application during production.

`AUTH_NO_ORIGIN` occurs when the authentication base URL of your application
could not be determined.

The simplest way to fix this is to set the `AUTH_URL` environment variable:

```bash
AUTH_URL=https://my-awesome-app.com
```

For a detailed guide on path resolution, refer to the
[URL Resolution page](../guide/advanced/url-resolutions.md).
