import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/db/migrate.ts'],
    },
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
