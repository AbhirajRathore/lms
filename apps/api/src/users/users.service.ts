import { Injectable } from '@nestjs/common';
import { ROLES, type CurrentUser, type Role } from '@lms/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { VerifiedIdentity } from '../auth/token-verifier.js';

/** Roles deduplicated and in a fixed order, so stored and token roles compare equal. */
function normalizeRoles(roles: readonly Role[]): Role[] {
  return ROLES.filter((role) => roles.includes(role));
}

function sameRoles(a: readonly Role[], b: readonly Role[]): boolean {
  const left = normalizeRoles(a);
  const right = normalizeRoles(b);
  return left.length === right.length && left.every((role, i) => role === right[i]);
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the LMS user for a verified identity, creating it on first sign-in and syncing
   * email and roles when the token says something different. No write when nothing changed.
   *
   * Identity is the provider subject only. Email is not unique: when a Cognito user is deleted
   * and re-created (new `sub`, same email), the old row keeps its copy and the new subject still
   * gets in. Rows are never relinked by email.
   */
  async syncFromIdentity(identity: VerifiedIdentity): Promise<CurrentUser> {
    const roles = normalizeRoles(identity.roles);
    const existing = await this.prisma.user.findUnique({
      where: { externalId: identity.subject },
    });
    // An unverified email (e.g. a user changed their own email attribute) never replaces the
    // stored one. On first sign-in there is nothing to keep, so the token's email is used.
    const email = existing && !identity.emailVerified ? existing.email : identity.email;
    if (existing && existing.email === email && sameRoles(existing.roles, roles)) {
      return { id: existing.id, email: existing.email, roles: existing.roles };
    }

    // A single-unique-field upsert runs as INSERT ... ON CONFLICT, so concurrent first
    // requests for the same subject do not race.
    const user = await this.prisma.user.upsert({
      where: { externalId: identity.subject },
      create: { externalId: identity.subject, email, roles },
      update: { email, roles },
    });
    return { id: user.id, email: user.email, roles: user.roles };
  }
}
