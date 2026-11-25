import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Express's default 100 KB JSON limit is too small for a lesson body: 50 000 characters can be
 * 150 KB in UTF-8 (e.g. Chinese or Hindi text) and up to 300 KB when JSON-escaped.
 */
export const JSON_BODY_LIMIT = '1mb';

/** App settings shared by main.ts and the tests. Call before `listen()` / `init()`. */
export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
}
