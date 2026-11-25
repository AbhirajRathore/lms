import { createDevVerifier, createTokenVerifier } from './token-verifier.js';
import type { Env } from '../config/env.js';

const baseEnv: Env = {
  NODE_ENV: 'development',
  PORT: 3000,
  DATABASE_URL: 'postgresql://x',
  CORS_ORIGIN: 'http://localhost:5173',
  COGNITO_USER_POOL_ID: undefined,
  COGNITO_CLIENT_ID: undefined,
};

describe('dev token verifier', () => {
  const verifier = createDevVerifier();

  it('defaults to the learner role', async () => {
    await expect(verifier.verify('a@b.com')).resolves.toEqual({
      id: 'dev-a@b.com',
      email: 'a@b.com',
      roles: ['learner'],
    });
  });

  it('keeps only known roles', async () => {
    const user = await verifier.verify('a@b.com:admin,owner,instructor');
    expect(user.roles).toEqual(['admin', 'instructor']);
  });

  it('rejects a token without an email', async () => {
    await expect(verifier.verify('nope')).rejects.toThrow();
  });
});

describe('createTokenVerifier', () => {
  it('refuses the dev verifier in production', () => {
    expect(() => createTokenVerifier({ ...baseEnv, NODE_ENV: 'production' })).toThrow();
  });
});
