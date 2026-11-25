import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { testDatabaseUrl } from './test-db.js';

const apiRoot = fileURLToPath(new URL('../..', import.meta.url));

/** Creates the test database if it is missing, then applies the migrations to it. */
export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  const target = new URL(url);
  const name = target.pathname.slice(1);

  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  maintenance.search = '';
  const admin = new PrismaClient({
    adapter: new PrismaPg({ connectionString: maintenance.toString() }),
  });
  try {
    const existing = await admin.$queryRaw<
      unknown[]
    >`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (existing.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name.replaceAll('"', '""')}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  execFileSync('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
