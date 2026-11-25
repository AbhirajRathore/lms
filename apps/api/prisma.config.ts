import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // `prisma generate` runs without a database; migrate commands need DATABASE_URL set.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
