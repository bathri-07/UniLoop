/**
 * Dedicated E2E Test Backend Process Entrypoint
 * Explicitly sets process.env.E2E_TEST = 'true' before booting application modules.
 * Cross-platform compatible (works natively on Windows, macOS, Linux).
 */

// Fail fast if invoked in production mode - AGENTS.md security invariants
if (process.env.NODE_ENV === 'production') {
  console.error('[FATAL CONFIG ERROR] Dedicated E2E test server cannot run in production mode (NODE_ENV=production).');
  process.exit(1);
}

// Explicitly mark process as E2E test backend before importing application tree
process.env.E2E_TEST = 'true';

// Dynamic import ensures process.env.E2E_TEST is initialized before ES module dependency graph loads
import('./index').catch((err) => {
  console.error('[E2E Server] Failed to boot backend application:', err);
  process.exit(1);
});
