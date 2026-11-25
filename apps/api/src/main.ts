import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { ENV } from './config/config.module.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = app.get<Env>(ENV);

  app.use(helmet());
  app.enableCors({ origin: env.CORS_ORIGIN.split(',') });
  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(env.PORT);
}

void bootstrap();
