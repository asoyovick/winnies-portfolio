import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    hookTimeout: 120000,
    testTimeout: 30000,
    // Isolate tests from the dev database.
    setupFiles: ['./src/test/setup.ts'],
  },
});
