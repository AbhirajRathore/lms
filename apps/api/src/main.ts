import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ENV } from './config/config.module.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const env = app.get<Env>(ENV);

  app.use(helmet());
  app.enableCors({ origin: env.CORS_ORIGIN.split(',') });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  await app.listen(env.PORT);
}

void bootstrap();
