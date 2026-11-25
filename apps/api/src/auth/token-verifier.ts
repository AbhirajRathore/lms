import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { isRole, type CurrentUser } from '@lms/shared';
import type { Env } from '../config/env.js';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

/** Turns a bearer token into the signed-in user, or throws. */
export interface TokenVerifier {
  verify(token: string): Promise<CurrentUser>;
}

/** Verifies Cognito ID tokens; roles come from the user's Cognito groups. */
export function createCognitoVerifier(userPoolId: string, clientId: string): TokenVerifier {
  const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' });
  return {
    async verify(token) {
      const payload = await verifier.verify(token);
      const groups = payload['cognito:groups'] ?? [];
      return {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : '',
        roles: groups.filter(isRole),
      };
    },
  };
}

/**
 * Local-only verifier: the token is "<email>" or "<email>:<role>,<role>".
 * Never used in production (env validation requires Cognito there).
 */
export function createDevVerifier(): TokenVerifier {
  return {
    verify(token) {
      const [email = '', roleList = 'learner'] = token.split(':');
      if (!email.includes('@')) {
        return Promise.reject(new Error('Dev token must start with an email'));
      }
      return Promise.resolve({
        id: `dev-${email}`,
        email,
        roles: roleList.split(',').filter(isRole),
      });
    },
  };
}

export function createTokenVerifier(env: Env): TokenVerifier {
  if (env.COGNITO_USER_POOL_ID && env.COGNITO_CLIENT_ID) {
    return createCognitoVerifier(env.COGNITO_USER_POOL_ID, env.COGNITO_CLIENT_ID);
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('Cognito must be configured in production');
  }
  return createDevVerifier();
}
