import { z } from 'zod';

const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: optional,
    // On AWS the RDS secret is injected as separate fields instead of DATABASE_URL.
    DB_HOST: optional,
    DB_PORT: optional,
    DB_NAME: optional,
    DB_USER: optional,
    DB_PASSWORD: optional,
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    COGNITO_USER_POOL_ID: optional,
    COGNITO_CLIENT_ID: optional,
  })
  .transform(({ DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, ...env }, ctx) => {
    let databaseUrl = env.DATABASE_URL;
    if (!databaseUrl && DB_HOST && DB_NAME && DB_USER && DB_PASSWORD) {
      const user = encodeURIComponent(DB_USER);
      const password = encodeURIComponent(DB_PASSWORD);
      databaseUrl = `postgresql://${user}:${password}@${DB_HOST}:${DB_PORT ?? '5432'}/${DB_NAME}?schema=public&sslmode=require`;
    }
    if (!databaseUrl) {
      ctx.addIssue({
        code: 'custom',
        message: 'Set DATABASE_URL (or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD)',
      });
      return z.NEVER;
    }
    if (env.NODE_ENV === 'production' && !(env.COGNITO_USER_POOL_ID && env.COGNITO_CLIENT_ID)) {
      ctx.addIssue({
        code: 'custom',
        message: 'COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are required in production',
      });
      return z.NEVER;
    }
    return { ...env, DATABASE_URL: databaseUrl };
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
