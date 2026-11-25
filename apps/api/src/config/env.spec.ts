import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv({ DATABASE_URL: 'postgresql://x' });
    expect(env.PORT).toBe(3000);
    expect(env.COGNITO_USER_POOL_ID).toBeUndefined();
  });

  it('builds DATABASE_URL from the RDS secret fields', () => {
    const env = loadEnv({
      DB_HOST: 'db.internal',
      DB_PORT: '5432',
      DB_NAME: 'lms',
      DB_USER: 'lms',
      DB_PASSWORD: 'p@ss/word',
    });
    expect(env.DATABASE_URL).toBe(
      'postgresql://lms:p%40ss%2Fword@db.internal:5432/lms?schema=public&sslmode=require',
    );
  });

  it('requires Cognito in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x' })).toThrow(
      /COGNITO/,
    );
  });

  it('requires a database', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });
});
