/**
 * Next.js instrumentation.
 *
 * Runs once when the server starts. It checks that the database can be
 * reached, so a misconfigured connection shows up in the host's logs
 * immediately rather than as a failing first request.
 */
export async function register(): Promise<void> {
  // The file is compiled for more than one runtime; only the Node.js one has a
  // database and process signals.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { checkDatabase } = await import('./lib/db/health');
  await checkDatabase();

  const { closePool } = await import('./lib/db');
  const shutdown = () => {
    void closePool();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
