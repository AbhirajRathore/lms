import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { CourseDetail, Lesson, LessonInput } from '@lms/shared';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { ENV } from '../../src/config/config.module.js';
import { loadEnv } from '../../src/config/env.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { testDatabaseUrl } from './test-db.js';

/** Dev bearer tokens, as in apps/web/src/api/dev-auth.ts. */
export const TOKENS = {
  admin: 'admin@lms.local:admin',
  instructor: 'instructor@lms.local:instructor',
  otherInstructor: 'instructor2@lms.local:instructor',
  learner: 'learner@lms.local:learner',
} as const;
export type Persona = keyof typeof TOKENS;

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

/** The real app wired to the test database. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(loadEnv({ NODE_ENV: 'test', DATABASE_URL: testDatabaseUrl() }))
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Lesson", "Course", "User" CASCADE');
}

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** A request to /api<path> signed in as `persona`. */
export function call(app: INestApplication, persona: Persona, method: Method, path: string) {
  return request(app.getHttpServer())
    [method](`/api${path}`)
    .set('Authorization', `Bearer ${TOKENS[persona]}`);
}

export const textLesson = (title: string): LessonInput => ({
  title,
  type: 'text',
  body: `Body of ${title}`,
});

export async function createCourse(
  app: INestApplication,
  persona: Persona,
  title = 'Course',
): Promise<CourseDetail> {
  const res = await call(app, persona, 'post', '/manage/courses').send({ title }).expect(201);
  return res.body as CourseDetail;
}

export async function addLesson(
  app: INestApplication,
  persona: Persona,
  courseId: string,
  input: LessonInput,
): Promise<Lesson> {
  const res = await call(app, persona, 'post', `/manage/courses/${courseId}/lessons`)
    .send(input)
    .expect(201);
  return res.body as Lesson;
}

/** A published course owned by `persona`, with `lessonCount` text lessons. */
export async function createPublishedCourse(
  app: INestApplication,
  persona: Persona,
  title = 'Published course',
  lessonCount = 1,
): Promise<CourseDetail> {
  const course = await createCourse(app, persona, title);
  for (let i = 0; i < lessonCount; i++)
    await addLesson(app, persona, course.id, textLesson(`L${i}`));
  const res = await call(app, persona, 'post', `/manage/courses/${course.id}/publish`).expect(200);
  return res.body as CourseDetail;
}
