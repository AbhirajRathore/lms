/** The integration-test database. Never the dev database: tests truncate every table. */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://lms:lms@localhost:54330/lms_test';
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith('_test')) {
    throw new Error(`TEST_DATABASE_URL must name a database ending in "_test" (got "${name}")`);
  }
  return url;
}
