/**
 * Playwright global setup. Runs once before any test or the dev
 * `webServer` starts.
 *
 * We invoke a production build of the playground here so that a
 * regression in the SDK's client-shipped surface (for example, leaking
 * a server-only import into a client-reachable bundle) fails the test
 * run with a clear stack trace rather than passing silently in dev
 * mode, which lazily transforms modules on demand and never exercises
 * the full client graph.
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// noinspection JSUnusedGlobalSymbols
export default function globalSetup(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const playground = resolve(here, '..', 'playground');
  execSync('npm run build', { cwd: playground, stdio: 'inherit' });
}
