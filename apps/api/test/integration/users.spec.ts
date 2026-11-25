import request from 'supertest';
import type { CurrentUser } from '@lms/shared';
import { UsersService } from '../../src/users/users.service.js';
import { call, createCourse, createTestApp, resetDatabase, type TestContext } from './helpers.js';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const me = async (token: string): Promise<CurrentUser> =>
  (
    await request(ctx.app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  ).body as CurrentUser;

describe('user upsert from the token', () => {
  it('creates the user on first sign-in and returns the database id', async () => {
    const user = await me('new.person@lms.local:instructor');
    const row = await ctx.prisma.user.findUniqueOrThrow({
      where: { externalId: 'dev-new.person@lms.local' },
    });
    expect(user).toEqual({ id: row.id, email: 'new.person@lms.local', roles: ['instructor'] });
    expect(row.roles).toEqual(['instructor']);
  });

  it('does not write when nothing changed', async () => {
    const first = await me('same@lms.local:learner');
    const before = await ctx.prisma.user.findUniqueOrThrow({ where: { id: first.id } });
    const second = await me('same@lms.local:learner');
    const after = await ctx.prisma.user.findUniqueOrThrow({ where: { id: first.id } });
    expect(second.id).toBe(first.id);
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(await ctx.prisma.user.count()).toBe(1);
  });

  it('syncs roles when the token changes them', async () => {
    const before = await me('promoted@lms.local:learner');
    const after = await me('promoted@lms.local:instructor,admin');
    expect(after).toEqual({
      id: before.id,
      email: 'promoted@lms.local',
      roles: ['admin', 'instructor'],
    });
    expect(await ctx.prisma.user.count()).toBe(1);
  });

  it('creates one row for concurrent first requests', async () => {
    const users = await Promise.all(Array.from({ length: 5 }, () => me('burst@lms.local')));
    expect(new Set(users.map((user) => user.id)).size).toBe(1);
    expect(await ctx.prisma.user.count()).toBe(1);
  });

  it('records the database id as the course creator', async () => {
    const course = await createCourse(ctx.app, 'instructor');
    const user = await me('instructor@lms.local:instructor');
    expect(course.createdBy).toEqual({ id: user.id, email: 'instructor@lms.local' });
    await call(ctx.app, 'instructor', 'get', `/manage/courses/${course.id}`).expect(200);
  });

  it('lets a re-created identity (new subject, same email) in instead of locking it out', async () => {
    const users = ctx.app.get(UsersService);
    const old = await users.syncFromIdentity({
      subject: 'sub-old',
      email: 'pat@corp.example',
      emailVerified: true,
      roles: ['learner'],
    });
    const recreated = await users.syncFromIdentity({
      subject: 'sub-new',
      email: 'pat@corp.example',
      emailVerified: true,
      roles: ['learner'],
    });
    expect(recreated.id).not.toBe(old.id);
    expect(recreated.email).toBe('pat@corp.example');
    expect(await ctx.prisma.user.count()).toBe(2);
  });

  it('keeps the stored email when the token carries an unverified one', async () => {
    const users = ctx.app.get(UsersService);
    const first = await users.syncFromIdentity({
      subject: 'sub-1',
      email: 'real@corp.example',
      emailVerified: true,
      roles: ['learner'],
    });
    const spoofed = await users.syncFromIdentity({
      subject: 'sub-1',
      email: 'ceo@corp.example',
      emailVerified: false,
      roles: ['learner'],
    });
    expect(spoofed).toEqual(first);
    const verified = await users.syncFromIdentity({
      subject: 'sub-1',
      email: 'new.address@corp.example',
      emailVerified: true,
      roles: ['learner'],
    });
    expect(verified.email).toBe('new.address@corp.example');
  });
});
