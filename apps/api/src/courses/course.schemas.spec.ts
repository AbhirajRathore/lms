import { formatProblem } from '../common/zod-validation.pipe.js';
import {
  createCourseSchema,
  createLessonSchema,
  isHttpsUrl,
  lessonProblems,
  updateLessonSchema,
} from './course.schemas.js';
import { reorderProblems } from './lessons.service.js';

describe('course schemas', () => {
  it('trims strings and turns empty optional strings into null', () => {
    expect(createCourseSchema.parse({ title: '  A  ', description: ' ' })).toEqual({
      title: 'A',
      description: null,
    });
  });

  it('normalizes a new lesson', () => {
    expect(
      createLessonSchema.parse({ title: 'Intro', type: 'video', url: 'https://x.test/v.mp4' }),
    ).toEqual({
      title: 'Intro',
      type: 'video',
      body: null,
      url: 'https://x.test/v.mp4',
      durationMinutes: null,
    });
  });

  it('keeps absent PATCH fields undefined and cleared ones null', () => {
    expect(updateLessonSchema.parse({ body: '' })).toEqual({ body: null });
  });

  it('reports readable messages', () => {
    const result = createLessonSchema.safeParse({ type: 'text', extra: 1 });
    expect(result.error?.issues.map(formatProblem)).toEqual([
      'title is required',
      'Unrecognized key: "extra"',
    ]);
  });
});

describe('lessonProblems', () => {
  it('requires a body for text and a url for media', () => {
    expect(lessonProblems({ type: 'text', body: null, url: null }).map(formatProblem)).toEqual([
      'body is required for text lessons',
    ]);
    expect(lessonProblems({ type: 'document', body: null, url: null }).map(formatProblem)).toEqual([
      'url is required for document lessons',
    ]);
    expect(lessonProblems({ type: 'video', body: 'notes', url: 'https://x.test' })).toEqual([]);
  });
});

describe('isHttpsUrl', () => {
  it.each([
    ['https://example.com/a.pdf', true],
    ['http://example.com', false],
    ['/relative', false],
    ['javascript:alert(1)', false],
  ])('%s -> %s', (url, ok) => {
    expect(isHttpsUrl(url)).toBe(ok);
  });
});

describe('reorderProblems', () => {
  it('accepts exactly the lesson ids in any order', () => {
    expect(reorderProblems(['a', 'b'], ['b', 'a'])).toEqual([]);
  });

  it('flags duplicates, unknown and missing ids', () => {
    expect(reorderProblems(['a', 'b', 'c'], ['a', 'a', 'x']).map(formatProblem)).toEqual([
      'lessonIds must not contain duplicates',
      'lessonIds contains 1 id(s) that are not lessons of this course',
      'lessonIds must list every lesson of the course (2 missing)',
    ]);
  });
});
