import { LIMITS, type CourseDetail, type Lesson } from '@lms/shared';
import {
  addLesson,
  call,
  createCourse,
  createPublishedCourse,
  createTestApp,
  resetDatabase,
  textLesson,
  type TestContext,
} from './helpers.js';

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

async function lessonsOf(courseId: string): Promise<Pick<Lesson, 'title' | 'position'>[]> {
  const res = await call(ctx.app, 'admin', 'get', `/manage/courses/${courseId}`).expect(200);
  return (res.body as CourseDetail).lessons.map(({ title, position }) => ({ title, position }));
}

async function courseWithLessons(titles: string[]): Promise<{ id: string; lessons: Lesson[] }> {
  const course = await createCourse(ctx.app, 'instructor');
  const lessons: Lesson[] = [];
  for (const title of titles)
    lessons.push(await addLesson(ctx.app, 'instructor', course.id, textLesson(title)));
  return { id: course.id, lessons };
}

describe('adding lessons', () => {
  it('appends at the end and bumps the course updatedAt', async () => {
    const course = await createCourse(ctx.app, 'instructor');
    const first = await addLesson(ctx.app, 'instructor', course.id, textLesson('One'));
    const second = await addLesson(ctx.app, 'instructor', course.id, {
      title: '  Two  ',
      type: 'video',
      url: 'https://example.com/intro.mp4',
      body: '',
      durationMinutes: 5,
    });
    expect(first).toMatchObject({ courseId: course.id, position: 0, url: null });
    expect(second).toEqual({
      id: expect.any(String),
      courseId: course.id,
      title: 'Two',
      type: 'video',
      body: null,
      url: 'https://example.com/intro.mp4',
      durationMinutes: 5,
      position: 1,
    });

    const detail = (
      await call(ctx.app, 'instructor', 'get', `/manage/courses/${course.id}`).expect(200)
    ).body as CourseDetail;
    expect(detail.lessonCount).toBe(2);
    expect(Date.parse(detail.updatedAt)).toBeGreaterThan(Date.parse(course.updatedAt));
  });

  it('keeps positions contiguous under concurrent appends', async () => {
    const course = await createCourse(ctx.app, 'instructor');
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        call(ctx.app, 'instructor', 'post', `/manage/courses/${course.id}/lessons`)
          .send(textLesson(`L${i}`))
          .expect(201),
      ),
    );
    const positions = (await lessonsOf(course.id)).map((lesson) => lesson.position);
    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('accepts a full-length body in any script (the JSON body limit fits it)', async () => {
    const course = await createCourse(ctx.app, 'instructor');
    // 3 bytes per character in UTF-8: about 150 KB, over Express's default 100 KB limit.
    const body = '安全'.repeat(LIMITS.lessonBody / 2);
    const lesson = await addLesson(ctx.app, 'instructor', course.id, { ...textLesson('T'), body });
    expect(lesson.body).toHaveLength(LIMITS.lessonBody);

    const res = await call(ctx.app, 'instructor', 'post', `/manage/courses/${course.id}/lessons`)
      .send({ ...textLesson('T'), body: `${body}安` })
      .expect(400);
    expect(res.body.message).toContain('body must be at most 50000 characters');
  });

  it('keeps positions contiguous under concurrent appends and deletes', async () => {
    const { id, lessons } = await courseWithLessons(['A', 'B', 'C', 'D', 'E', 'F']);
    const path = `/manage/courses/${id}/lessons`;
    const results = await Promise.all([
      ...lessons
        .slice(0, 4)
        .map((lesson) => call(ctx.app, 'instructor', 'delete', `${path}/${lesson.id}`)),
      ...['G', 'H', 'I'].map((title) =>
        call(ctx.app, 'instructor', 'post', path).send(textLesson(title)),
      ),
    ]);
    expect(results.map((res) => res.status)).toEqual([204, 204, 204, 204, 201, 201, 201]);
    const remaining = await lessonsOf(id);
    expect(remaining.map((lesson) => lesson.position)).toEqual([0, 1, 2, 3, 4]);
    expect(remaining.map((lesson) => lesson.title).slice(0, 2)).toEqual(['E', 'F']);
  });

  it('refuses a lesson when the course is full', async () => {
    const course = await createCourse(ctx.app, 'instructor');
    await ctx.prisma.lesson.createMany({
      data: Array.from({ length: LIMITS.lessonsPerCourse }, (_, position) => ({
        courseId: course.id,
        title: `L${position}`,
        type: 'text' as const,
        body: 'Body',
        position,
      })),
    });
    const res = await call(ctx.app, 'instructor', 'post', `/manage/courses/${course.id}/lessons`)
      .send(textLesson('One too many'))
      .expect(400);
    expect(res.body.message).toBe('A course can hold at most 200 lessons');
  });

  it.each([
    [
      'a text lesson without body',
      { title: 'T', type: 'text' },
      'body is required for text lessons',
    ],
    [
      'a text lesson with a url',
      { title: 'T', type: 'text', body: 'B', url: 'https://example.com' },
      'url must be empty for text lessons',
    ],
    [
      'a video with an http URL',
      { title: 'T', type: 'video', url: 'http://example.com/v.mp4' },
      'url must be an absolute https URL',
    ],
    [
      'a relative URL',
      { title: 'T', type: 'document', url: '/files/a.pdf' },
      'url must be an absolute https URL',
    ],
    ['a video without url', { title: 'T', type: 'video' }, 'url is required for video lessons'],
    [
      'too-long notes',
      { title: 'T', type: 'document', url: 'https://example.com/a.pdf', body: 'x'.repeat(5001) },
      'body (notes) must be at most 5000 characters for document lessons',
    ],
    [
      'a too-long text body',
      { title: 'T', type: 'text', body: 'x'.repeat(50_001) },
      'body must be at most 50000 characters',
    ],
    ['an unknown type', { title: 'T', type: 'quiz' }, 'type must be one of text, video, document'],
    [
      'a too-long title',
      { ...textLesson('x'.repeat(201)) },
      'title must be at most 200 characters',
    ],
    [
      'a zero duration',
      { ...textLesson('T'), durationMinutes: 0 },
      'durationMinutes must be between 1 and 600',
    ],
    [
      'a fractional duration',
      { ...textLesson('T'), durationMinutes: 1.5 },
      'durationMinutes must be a whole number',
    ],
    ['an unknown field', { ...textLesson('T'), position: 3 }, 'Unrecognized key: "position"'],
  ])('rejects %s', async (_name, body, message) => {
    const course = await createCourse(ctx.app, 'instructor');
    const res = await call(ctx.app, 'instructor', 'post', `/manage/courses/${course.id}/lessons`)
      .send(body)
      .expect(400);
    expect(res.body.message).toContain(message);
  });
});

describe('editing lessons', () => {
  it('validates the merged lesson', async () => {
    const { id, lessons } = await courseWithLessons(['Intro']);
    const path = `/manage/courses/${id}/lessons/${lessons[0]!.id}`;

    const noUrl = await call(ctx.app, 'instructor', 'patch', path)
      .send({ type: 'video' })
      .expect(400);
    expect(noUrl.body.message).toEqual(['url is required for video lessons']);

    const video = await call(ctx.app, 'instructor', 'patch', path)
      .send({ type: 'video', url: 'https://example.com/v.webm', durationMinutes: 7 })
      .expect(200);
    // The old text body is kept as notes.
    expect(video.body).toMatchObject({ type: 'video', body: 'Body of Intro', durationMinutes: 7 });

    await call(ctx.app, 'instructor', 'patch', path).send({ url: null }).expect(400);
    await call(ctx.app, 'instructor', 'patch', path).send({ type: 'text' }).expect(400);
    const text = await call(ctx.app, 'instructor', 'patch', path)
      .send({ type: 'text', url: '', durationMinutes: null })
      .expect(200);
    expect(text.body).toMatchObject({
      type: 'text',
      url: null,
      durationMinutes: null,
      position: 0,
    });
  });

  it('404s for a lesson of another course or a non-uuid lesson id', async () => {
    const a = await courseWithLessons(['A']);
    const b = await courseWithLessons(['B']);
    const res = await call(
      ctx.app,
      'instructor',
      'patch',
      `/manage/courses/${a.id}/lessons/${b.lessons[0]!.id}`,
    )
      .send({ title: 'X' })
      .expect(404);
    expect(res.body.message).toBe('Lesson not found');
    await call(ctx.app, 'instructor', 'delete', `/manage/courses/${a.id}/lessons/nope`).expect(404);
  });
});

describe('deleting lessons', () => {
  it('renumbers the remaining lessons', async () => {
    const { id, lessons } = await courseWithLessons(['A', 'B', 'C', 'D']);
    await call(
      ctx.app,
      'instructor',
      'delete',
      `/manage/courses/${id}/lessons/${lessons[1]!.id}`,
    ).expect(204);
    expect(await lessonsOf(id)).toEqual([
      { title: 'A', position: 0 },
      { title: 'C', position: 1 },
      { title: 'D', position: 2 },
    ]);
    await call(
      ctx.app,
      'instructor',
      'delete',
      `/manage/courses/${id}/lessons/${lessons[0]!.id}`,
    ).expect(204);
    expect(await lessonsOf(id)).toEqual([
      { title: 'C', position: 0 },
      { title: 'D', position: 1 },
    ]);
  });

  it('refuses to delete the last lesson of a published course', async () => {
    const course = await createPublishedCourse(ctx.app, 'instructor', 'Published', 1);
    const res = await call(
      ctx.app,
      'instructor',
      'delete',
      `/manage/courses/${course.id}/lessons/${course.lessons[0]!.id}`,
    ).expect(409);
    expect(res.body.statusCode).toBe(409);
    expect(await lessonsOf(course.id)).toHaveLength(1);
  });

  it('allows deleting the last lesson of a draft', async () => {
    const { id, lessons } = await courseWithLessons(['Only']);
    await call(
      ctx.app,
      'instructor',
      'delete',
      `/manage/courses/${id}/lessons/${lessons[0]!.id}`,
    ).expect(204);
    expect(await lessonsOf(id)).toEqual([]);
  });
});

describe('reordering lessons', () => {
  it('applies the new order', async () => {
    const { id, lessons } = await courseWithLessons(['A', 'B', 'C']);
    const [a, b, c] = lessons.map((lesson) => lesson.id);
    const res = await call(ctx.app, 'instructor', 'put', `/manage/courses/${id}/lessons/order`)
      .send({ lessonIds: [c, a, b] })
      .expect(200);
    expect((res.body as Lesson[]).map(({ title, position }) => [title, position])).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2],
    ]);
    expect((await lessonsOf(id)).map((lesson) => lesson.title)).toEqual(['C', 'A', 'B']);
  });

  it('rejects ids that are not exactly the course lessons', async () => {
    const { id, lessons } = await courseWithLessons(['A', 'B', 'C']);
    const other = await courseWithLessons(['X']);
    const [a, b, c] = lessons.map((lesson) => lesson.id);
    const cases: [unknown, string][] = [
      [[a, b], 'lessonIds must list every lesson of the course (1 missing)'],
      [
        [a, b, c, other.lessons[0]!.id],
        'lessonIds contains 1 id(s) that are not lessons of this course',
      ],
      [[a, b, b, c], 'lessonIds must not contain duplicates'],
      [[a, b, 'not-a-uuid'], 'lessonIds contains 1 id(s) that are not lessons of this course'],
      ['a,b,c', 'lessonIds must be an array of lesson ids'],
      [undefined, 'lessonIds is required'],
    ];
    for (const [lessonIds, message] of cases) {
      const res = await call(ctx.app, 'instructor', 'put', `/manage/courses/${id}/lessons/order`)
        .send({ lessonIds })
        .expect(400);
      expect(res.body.message).toContain(message);
    }
    expect((await lessonsOf(id)).map((lesson) => lesson.title)).toEqual(['A', 'B', 'C']);
  });
});

describe('course updatedAt', () => {
  const updatedAt = async (courseId: string): Promise<number> => {
    const res = await call(ctx.app, 'admin', 'get', `/manage/courses/${courseId}`).expect(200);
    return Date.parse((res.body as CourseDetail).updatedAt);
  };
  // Timestamps have millisecond precision; make sure each change lands on a later one.
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

  it('is bumped by editing, deleting and reordering lessons', async () => {
    const { id, lessons } = await courseWithLessons(['A', 'B', 'C']);
    const [a, b, c] = lessons.map((lesson) => lesson.id);
    const changes = [
      () =>
        call(ctx.app, 'instructor', 'patch', `/manage/courses/${id}/lessons/${a}`)
          .send({ title: 'A2' })
          .expect(200),
      () =>
        call(ctx.app, 'instructor', 'put', `/manage/courses/${id}/lessons/order`)
          .send({ lessonIds: [c, b, a] })
          .expect(200),
      () => call(ctx.app, 'instructor', 'delete', `/manage/courses/${id}/lessons/${b}`).expect(204),
    ];
    for (const change of changes) {
      const before = await updatedAt(id);
      await tick();
      await change();
      expect(await updatedAt(id)).toBeGreaterThan(before);
    }
  });
});
