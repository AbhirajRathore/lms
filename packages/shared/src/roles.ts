export const ROLES = ['admin', 'instructor', 'learner'] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Roles that may create and edit courses. */
export const AUTHOR_ROLES = ['admin', 'instructor'] as const satisfies readonly Role[];

export function canAuthor(roles: readonly Role[]): boolean {
  return roles.some((role) => (AUTHOR_ROLES as readonly Role[]).includes(role));
}
