import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { CurrentUser as CurrentUserType } from '@lms/shared';

export interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: CurrentUserType;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType | undefined =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);
