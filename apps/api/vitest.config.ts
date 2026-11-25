import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.spec.ts', 'test/*.spec.ts'] },
      },
      {
        // Real Postgres (TEST_DATABASE_URL, default lms_test on the docker compose service).
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.spec.ts'],
          globalSetup: ['test/integration/global-setup.ts'],
          // The files share one database and truncate it between tests.
          fileParallelism: false,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
