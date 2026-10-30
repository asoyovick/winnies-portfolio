/**
 * Node.js-only instrumentation hook.
 *
 * Loaded by `instrumentation.ts` when the Node.js runtime is active. It checks
 * that the database can be reached on startup and closes the connection pool
 * on shutdown so the process can exit cleanly.
 */
export async function register(): Promise<void> {
  const { checkDatabase } = await import('./lib/db/health');
  await checkDatabase();

  const { closePool } = await import('./lib/db');
  const shutdown = () => {
    void closePool();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
