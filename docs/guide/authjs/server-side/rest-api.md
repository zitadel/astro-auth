---
title: REST API
group: OAuth Provider
category: Server Side
---

# REST API

The mounted auth handler exposes the OAuth REST endpoints under the
configured basePath (default `/api/auth`):

| Method | Path                     | Purpose                                       |
| ------ | ------------------------ | --------------------------------------------- |
| GET    | `/api/auth/session`      | Current session (JSON), `{}` if unauth.      |
| GET    | `/api/auth/csrf`         | CSRF token (double-submit cookie pattern)    |
| GET    | `/api/auth/providers`    | Configured providers (id, name, signinUrl…)  |
| GET    | `/api/auth/signin`       | Sign-in chooser page (HTML)                  |
| POST   | `/api/auth/signin/:provider` | Provider-specific sign-in form submit    |
| GET    | `/api/auth/callback/:provider` | OAuth callback receiver                 |
| POST   | `/api/auth/signout`      | Sign out the current session                 |
| GET    | `/api/auth/error`        | Error page (HTML)                            |

These routes are wired automatically by the auth handler — you don't need to
create individual files for each one.

## Custom basePath

If you mount the handler under a different path, all routes shift
accordingly. Set the same `basePath` on the auth config (passed to the
factory) and the URL of the catch-all route.

## CSRF

State-changing endpoints (signin POST, signout POST) require the CSRF
double-submit token. Fetch `/api/auth/csrf` first to get the token + cookie
pair, then include both in your POST.
