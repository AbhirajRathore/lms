import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ENV } from '../src/config/config.module.js';
import { loadEnv } from '../src/config/env.js';

describe('API (e2e, database mocked)', () => {
  let app: INestApplication;
  const prisma = {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
    course: { findMany: vi.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENV)
      .useValue(loadEnv({ NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused' }))
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health is public and reports the database', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('GET /api/health reports degraded when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('down'));
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'down' });
  });

  it('GET /api/me needs a token', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('GET /api/me returns the signed-in user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', 'Bearer dev@lms.local:instructor')
      .expect(200);
    expect(res.body).toEqual({
      id: 'dev-dev@lms.local',
      email: 'dev@lms.local',
      roles: ['instructor'],
    });
  });

  it('GET /api/courses lists published courses', async () => {
    prisma.course.findMany.mockResolvedValueOnce([
      {
        id: 'c1',
        title: 'Intro',
        description: null,
        published: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    const res = await request(app.getHttpServer())
      .get('/api/courses')
      .set('Authorization', 'Bearer dev@lms.local')
      .expect(200);
    expect(res.body).toEqual([
      {
        id: 'c1',
        title: 'Intro',
        description: null,
        published: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });
});
