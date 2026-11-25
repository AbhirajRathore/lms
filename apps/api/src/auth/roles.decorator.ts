import { SetMetadata } from '@nestjs/common';
import type { Role } from '@lms/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to users holding at least one of these roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
