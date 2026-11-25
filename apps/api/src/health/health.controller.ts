import { Controller, Get, Logger } from '@nestjs/common';
import type { HealthResponse } from '@lms/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../auth/public.decorator.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(): Promise<HealthResponse> {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(
      () => 'up' as const,
      (error: unknown) => {
        this.logger.warn(`Database check failed: ${String(error)}`);
        return 'down' as const;
      },
    );
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      version: process.env.APP_VERSION ?? 'dev',
    };
  }
}
