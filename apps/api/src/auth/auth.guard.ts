import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from './public.decorator.js';
import type { AuthedRequest } from './current-user.decorator.js';
import { TOKEN_VERIFIER, type TokenVerifier, type VerifiedIdentity } from './token-verifier.js';
import { UsersService } from '../users/users.service.js';

/**
 * Global guard: every route needs a valid bearer token unless marked @Public().
 * The verified identity is mapped to (and kept in sync with) a User row; request.user
 * carries that row's database id.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();

    let identity: VerifiedIdentity;
    try {
      identity = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException();
    }
    request.user = await this.users.syncFromIdentity(identity);
    return true;
  }
}
