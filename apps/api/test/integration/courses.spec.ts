import type { CourseDetail, CourseSummary, ManagedCourseSummary } from '@lms/shared';
import {
  addLesson,
  call,
  createCourse,
  createPublishedCourse,
  createTestApp,
  resetDatabase,
  textLesson,
  type Persona,
  type TestContext,
} from './helpers.js';

const PERSONAS: Persona[] = ['admin', 'instructor', 'otherInstructor', 'learner'];
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

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

describe('permissions on a draft course owned by "instructor"', () => {
  interface Fixture {
    courseId: string;
    lessonId: string;
  }
  type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
  interface Action {
    name: string;
    method: Method;
    path: (f: Fixture) => string;
    body?: (f: Fixture) => object;
    expected: Record<Persona, number>;
  }

  /** Admin and owner succeed; another instructor cannot see it (404); learners are refused (403). */
  const editors = (ok: number): Record<Persona, number> => ({
    admin: ok,
    instructor: ok,
    otherInstructor: 404,
    learner: 403,
  });

  const actions: Action[] = [
    {
      name: 'GET course (catalogue)',
      method: 'get',
      path: (f) => `/courses/${f.courseId}`,
      expected: { ...editors(200), learner: 404 },
    },
    {
      name: 'GET course (manage)',
      method: 'get',
      path: (f) => `/manage/courses/${f.courseId}`,
      expected: editors(200),
    },
    {
      name: 'PATCH course',
      method: 'patch',
      path: (f) => `/manage/courses/${f.courseId}`,
      body: () => ({ title: 'Renamed' }),
      expected: editors(200),
    },
    {
      name: 'publish',
      method: 'post',
      path: (f) => `/manage/courses/${f.courseId}/publish`,
      expected: editors(200),
    },
    {
      name: 'unpublish',
      method: 'post',
      path: (f) => `/manage/courses/${f.courseId}/unpublish`,
      expected: editors(200),
    },
    {
      name: 'DELETE course',
      method: 'delete',
      path: (f) => `/manage/courses/${f.courseId}`,
      expected: editors(204),
    },
    {
      name: 'add lesson',
      method: 'post',
      path: (f) => `/manage/courses/${f.courseId}/lessons`,
      body: () => textLesson('New'),
      expected: editors(201),
    },
    {
      name: 'PATCH lesson',
      method: 'patch',
      path: (f) => `/manage/courses/${f.courseId}/lessons/${f.lessonId}`,
      body: () => ({ title: 'Renamed' }),
      expected: editors(200),
    },
    {
      name: 'DELETE lesson',
      method: 'delete',
      path: (f) => `/manage/courses/${f.courseId}/lessons/${f.lessonId}`,
      expected: editors(204),
    },
    {
      name: 'reorder lessons',
      method: 'put',
      path: (f) => `/manage/courses/${f.courseId}/lessons/order`,
      body: (f) => ({ lessonIds: [f.lessonId] }),
      expected: editors(200),
    },
  ];

  for (const action of actions) {
    describe(action.name, () => {
      for (const persona of PERSONAS) {
        it(`${persona} -> ${action.expected[persona]}`, async () => {
          const course = await createCourse(ctx.app, 'instructor');
          const lesson = await addLesson(ctx.app, 'instructor', course.id, textLesson('First'));
          const fixture = { courseId: course.id, lessonId: lesson.id };
          const req = call(ctx.app, persona, action.method, action.path(fixture));
          const res = await (action.body ? req.send(action.body(fixture)) : req);
          expect(res.status).toBe(action.expected[persona]);
          if (res.status === 404) expect(res.body.message).toBe('Course not found');
        });
      }
    });
  }

  it('learners cannot list or create managed courses', async () => {
    await call(ctx.app, 'learner', 'get', '/manage/courses').expect(403);
    await call(ctx.app, 'learner', 'post', '/manage/courses').send({ title: 'X' }).expect(403);
  });

  it('reports canEdit per caller', async () => {
    const course = await createPublishedCourse(ctx.app, 'instructor');
    const canEdit = async (persona: Persona) =>
      (
        (await call(ctx.app, persona, 'get', `/courses/${course.id}`).expect(200))
          .body as CourseDetail
      ).canEdit;
    expect(await canEdit('admin')).toBe(true);
    expect(await canEdit('instructor')).toBe(true);
    expect(await canEdit('otherInstructor')).toBe(false);
    expect(await canEdit('learner')).toBe(false);
  });

  it('another instructor can read a published course but not edit it', async () => {
    const course = await createPublishedCourse(ctx.app, 'instructor');
    await call(ctx.app, 'otherInstructor', 'get', `/courses/${course.id}`).expect(200);
    await call(ctx.app, 'otherInstructor', 'get', `/manage/courses/${course.id}`).expect(404);
    await call(ctx.app, 'otherInstructor', 'patch', `/manage/courses/${course.id}`)
      .send({ title: 'Mine now' })
      .expect(404);
  });
});

describe('catalogue and draft visibility', () => {
  it('lists only published courses, newest first, with lesson counts', async () => {
    const older = await createPublishedCourse(ctx.app, 'instructor', 'Older', 2);
    await createCourse(ctx.app, 'instructor', 'Draft');
    const newer = await createPublishedCourse(ctx.app, 'otherInstructor', 'Newer', 1);

    const res = await call(ctx.app, 'learner', 'get', '/courses').expect(200);
    const courses = res.body as CourseSummary[];
    expect(courses.map((c) => c.title)).toEqual(['Newer', 'Older']);
    expect(courses.map((c) => c.lessonCount)).toEqual([1, 2]);
    expect(courses[0]).toEqual({
      id: newer.id,
      title: 'Newer',
      description: null,
      published: true,
      lessonCount: 1,
      createdAt: newer.createdAt,
      updatedAt: expect.any(String),
    });
    expect(older.publishedAt).toEqual(expect.any(String));
  });

  it('hides drafts from learners and other instructors with a 404', async () => {
    const draft = await createCourse(ctx.app, 'instructor', 'Draft');
    for (const persona of ['learner', 'otherInstructor'] as const) {
      const res = await call(ctx.app, persona, 'get', `/courses/${draft.id}`).expect(404);
      expect(res.body).toEqual({
        statusCode: 404,
        message: 'Course not found',
        error: 'Not Found',
      });
    }
    await call(ctx.app, 'instructor', 'get', `/courses/${draft.id}`).expect(200);
    await call(ctx.app, 'admin', 'get', `/courses/${draft.id}`).expect(200);
  });

  it('returns 404 for unknown and non-uuid ids', async () => {
    await call(ctx.app, 'admin', 'get', `/courses/${MISSING_ID}`).expect(404);
    await call(ctx.app, 'admin', 'get', '/courses/not-a-uuid').expect(404);
    await call(ctx.app, 'admin', 'get', '/manage/courses/123').expect(404);
    await call(ctx.app, 'admin', 'patch', `/manage/courses/${MISSING_ID}`)
      .send({ title: 'X' })
      .expect(404);
  });
});

describe('authoring list', () => {
  it('shows admins every course and instructors their own, most recently updated first', async () => {
    const first = await createCourse(ctx.app, 'instructor', 'First');
    await createCourse(ctx.app, 'instructor', 'Second');
    await createCourse(ctx.app, 'otherInstructor', 'Theirs');
    await call(ctx.app, 'instructor', 'patch', `/manage/courses/${first.id}`)
      .send({ description: 'Touched' })
      .expect(200);

    const admin = (await call(ctx.app, 'admin', 'get', '/manage/courses').expect(200))
      .body as ManagedCourseSummary[];
    expect(admin.map((c) => c.title)).toEqual(['First', 'Theirs', 'Second']);

    const own = (await call(ctx.app, 'instructor', 'get', '/manage/courses').expect(200))
      .body as ManagedCourseSummary[];
    expect(own.map((c) => c.title)).toEqual(['First', 'Second']);
    expect(own[0]).toMatchObject({
      published: false,
      publishedAt: null,
      lessonCount: 0,
      createdBy: { id: first.createdBy.id, email: 'instructor@lms.local' },
    });
  });
});

describe('course validation', () => {
  it('creates a trimmed draft owned by the caller', async () => {
    const res = await call(ctx.app, 'instructor', 'post', '/manage/courses')
      .send({ title: '  Safety basics  ', description: '   ' })
      .expect(201);
    const course = res.body as CourseDetail;
    expect(course).toMatchObject({
      title: 'Safety basics',
      description: null,
      published: false,
      publishedAt: null,
      lessons: [],
      lessonCount: 0,
      canEdit: true,
      createdBy: { email: 'instructor@lms.local' },
    });
  });

  it.each([
    ['a missing title', {}, 'title is required'],
    ['a blank title', { title: '   ' }, 'title is required'],
    ['a too-long title', { title: 'x'.repeat(201) }, 'title must be at most 200 characters'],
    [
      'a too-long description',
      { title: 'T', description: 'x'.repeat(2001) },
      'description must be at most 2000 characters',
    ],
    ['an unknown field', { title: 'T', published: true }, 'Unrecognized key: "published"'],
    ['a non-object body', ['T'], 'Request body must be a JSON object'],
  ])('rejects %s', async (_name, body, message) => {
    const res = await call(ctx.app, 'admin', 'post', '/manage/courses').send(body).expect(400);
    expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    expect(res.body.message).toContain(message);
  });

  it('PATCH changes only the given fields and clears an empty description', async () => {
    const course = await createCourse(ctx.app, 'instructor', 'Title');
    await call(ctx.app, 'instructor', 'patch', `/manage/courses/${course.id}`)
      .send({ description: 'Desc' })
      .expect(200);
    const res = await call(ctx.app, 'instructor', 'patch', `/manage/courses/${course.id}`)
      .send({ description: '' })
      .expect(200);
    expect(res.body).toMatchObject({ title: 'Title', description: null });
    await call(ctx.app, 'instructor', 'patch', `/manage/courses/${course.id}`)
      .send({ title: null })
      .expect(400);
  });
});

describe('publishing and deleting', () => {
  it('refuses to publish a course without lessons', async () => {
    const course = await createCourse(ctx.app, 'instructor');
    const res = await call(
      ctx.app,
      'instructor',
      'post',
      `/manage/courses/${course.id}/publish`,
    ).expect(400);
    expect(res.body.message).toBe('Add at least one lesson before publishing the course');
  });

  it('publishes and unpublishes idempotently', async () => {
    const course = await createPublishedCourse(ctx.app, 'instructor');
    expect(course.published).toBe(true);
    expect(course.publishedAt).toEqual(expect.any(String));

    const again = await call(
      ctx.app,
      'instructor',
      'post',
      `/manage/courses/${course.id}/publish`,
    ).expect(200);
    expect(again.body.publishedAt).toBe(course.publishedAt);
    expect(again.body.updatedAt).toBe(course.updatedAt);

    for (let i = 0; i < 2; i++) {
      const res = await call(
        ctx.app,
        'instructor',
        'post',
        `/manage/courses/${course.id}/unpublish`,
      ).expect(200);
      expect(res.body).toMatchObject({ published: false, publishedAt: null });
    }
  });

  it('refuses to delete a published course, then deletes it once unpublished', async () => {
    const course = await createPublishedCourse(ctx.app, 'instructor', 'Course', 2);
    const res = await call(ctx.app, 'admin', 'delete', `/manage/courses/${course.id}`).expect(409);
    expect(res.body.message).toBe('Unpublish the course before deleting it');

    await call(ctx.app, 'admin', 'post', `/manage/courses/${course.id}/unpublish`).expect(200);
    await call(ctx.app, 'admin', 'delete', `/manage/courses/${course.id}`).expect(204);
    await call(ctx.app, 'admin', 'get', `/manage/courses/${course.id}`).expect(404);
    expect(await ctx.prisma.lesson.count({ where: { courseId: course.id } })).toBe(0);
  });
});
