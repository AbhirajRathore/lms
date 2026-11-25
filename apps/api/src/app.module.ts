import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { CoursesModule } from './courses/courses.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, HealthModule, CoursesModule],
})
export class AppModule {}
