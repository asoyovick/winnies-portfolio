/**
 * Next.js instrumentation.
 *
 * Runs once when the server starts. It checks that the database can be
 * reached, so a misconfigured connection shows up in the host's logs
 * immediately rather than as a failing first request.
 *
 * Next.js compiles this hook for both the Node.js and the Edge runtime, so
 * Node.js-only work lives in `instrumentation.node.ts` and is only pulled in
 * while the Node.js runtime is the active one.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { register: registerNode } = await import('./instrumentation.node');
    await registerNode();
  }
}
