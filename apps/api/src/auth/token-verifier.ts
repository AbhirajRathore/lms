import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { isRole, type Role } from '@lms/shared';
import type { Env } from '../config/env.js';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

/** Who a valid token belongs to, as stated by the identity provider. */
export interface VerifiedIdentity {
  /** Stable identity-provider id (Cognito `sub`; dev tokens use `dev-<email>`). */
  subject: string;
  email: string;
  /**
   * Whether the provider has verified that the user owns `email`. A Cognito user can change
   * their own email attribute, which stays unverified until confirmed, so only verified
   * emails may replace the one already stored.
   */
  emailVerified: boolean;
  roles: Role[];
}

/** Turns a bearer token into a verified identity, or throws. */
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
}

/** Verifies Cognito ID tokens; roles come from the user's Cognito groups. */
export function createCognitoVerifier(userPoolId: string, clientId: string): TokenVerifier {
  const verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' });
  return {
    async verify(token) {
      const payload = await verifier.verify(token);
      if (typeof payload.email !== 'string' || !payload.email) {
        throw new Error('ID token has no email');
      }
      const groups = payload['cognito:groups'] ?? [];
      // Typed as boolean, but federated identities can carry the string "true".
      const verified: unknown = payload.email_verified;
      return {
        subject: payload.sub,
        email: payload.email,
        emailVerified: verified === true || verified === 'true',
        roles: groups.filter(isRole),
      };
    },
  };
}

/**
 * Local-only verifier: the token is "<email>" or "<email>:<role>,<role>".
 * Never used in production (createTokenVerifier refuses it there).
 */
export function createDevVerifier(): TokenVerifier {
  return {
    verify(token) {
      const [email = '', roleList = 'learner'] = token.split(':');
      if (!email.includes('@')) {
        return Promise.reject(new Error('Dev token must start with an email'));
      }
      return Promise.resolve({
        subject: `dev-${email}`,
        email,
        emailVerified: true,
        roles: [...new Set(roleList.split(',').filter(isRole))],
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
