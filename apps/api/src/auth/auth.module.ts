import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { TOKEN_VERIFIER, createTokenVerifier } from './token-verifier.js';
import { MeController } from './me.controller.js';

@Module({
  controllers: [MeController],
  providers: [
    { provide: TOKEN_VERIFIER, inject: [ENV], useFactory: (env: Env) => createTokenVerifier(env) },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
