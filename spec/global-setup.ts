/**
 * Playwright global setup. Runs once before any test or the dev
 * `webServer` starts.
 *
 * Installs playground dependencies (idempotent — npm ci is a no-op
 * when node_modules is already in sync with the lockfile) and then
 * runs a production build of the playground. The install step is
 * critical in CI environments where root `npm ci` does NOT cascade
 * into the playground (the playground is not a workspace).
 *
 * Building before tests start catches regressions in the SDK's
 * client-shipped surface (e.g. leaking a server-only import into a
 * client-reachable bundle) with a clear stack trace rather than
 * passing silently in dev mode, which lazily transforms modules on
 * demand and never exercises the full client graph.
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// noinspection JSUnusedGlobalSymbols
export default function globalSetup(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const playground = resolve(here, '..', 'playground');
  execSync('npm install --no-progress --no-audit --no-fund', {
    cwd: playground,
    stdio: 'inherit',
  });
  execSync('npm run build', { cwd: playground, stdio: 'inherit' });
}
