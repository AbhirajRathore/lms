import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ENV } from '../src/config/config.module.js';
import { loadEnv } from '../src/config/env.js';

const USER_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';
const userRow = {
  id: USER_ID,
  externalId: 'dev-dev@lms.local',
  email: 'dev@lms.local',
  roles: ['instructor'],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('API (e2e, database mocked)', () => {
  let app: NestExpressApplication;
  const prisma = {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
    user: { findUnique: vi.fn(), upsert: vi.fn() },
    course: { findMany: vi.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENV)
      .useValue(loadEnv({ NODE_ENV: 'test', DATABASE_URL: 'postgresql://unused' }))
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health is public and reports the database', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('GET /api/health reports degraded when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('down'));
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'down' });
  });

  it('GET /api/me needs a token', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('GET /api/me rejects a malformed dev token', async () => {
    await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', 'Bearer not-an-email')
      .expect(401);
  });

  it('GET /api/me returns the signed-in user with the database id', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(userRow);
    const res = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', 'Bearer dev@lms.local:instructor')
      .expect(200);
    expect(res.body).toEqual({ id: USER_ID, email: 'dev@lms.local', roles: ['instructor'] });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { externalId: 'dev-dev@lms.local' },
    });
    // Nothing changed, so no write.
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it('syncs roles from the token when they changed', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(userRow);
    prisma.user.upsert.mockResolvedValueOnce({ ...userRow, roles: ['admin'] });
    const res = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', 'Bearer dev@lms.local:admin')
      .expect(200);
    expect(res.body.roles).toEqual(['admin']);
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { email: 'dev@lms.local', roles: ['admin'] } }),
    );
  });

  it('GET /api/courses lists published courses', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...userRow, roles: ['learner'] });
    prisma.course.findMany.mockResolvedValueOnce([
      {
        id: 'c1',
        title: 'Intro',
        description: null,
        published: true,
        publishedAt: new Date('2026-01-02T00:00:00Z'),
        createdById: USER_ID,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-03T00:00:00Z'),
        _count: { lessons: 2 },
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
        lessonCount: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ]);
  });

  it('GET /api/manage/courses is 403 for a learner', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...userRow, roles: ['learner'] });
    await request(app.getHttpServer())
      .get('/api/manage/courses')
      .set('Authorization', 'Bearer dev@lms.local:learner')
      .expect(403);
    expect(prisma.course.findMany).not.toHaveBeenCalled();
  });

  it('GET /api/courses/:id is 404 for a non-uuid id', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...userRow, roles: ['learner'] });
    const res = await request(app.getHttpServer())
      .get('/api/courses/not-a-uuid')
      .set('Authorization', 'Bearer dev@lms.local:learner')
      .expect(404);
    expect(res.body).toEqual({ statusCode: 404, message: 'Course not found', error: 'Not Found' });
  });
});
