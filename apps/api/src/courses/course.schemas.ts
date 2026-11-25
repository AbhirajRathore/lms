import { z } from 'zod';
import { LESSON_TYPES, LIMITS, type LessonType } from '@lms/shared';
import type { Problem } from '../common/zod-validation.pipe.js';

// Messages are written to follow the field name: "title is required".

/** Top-level body check that keeps zod's own message for unknown keys. */
const bodyError = (issue: { code?: string }) =>
  issue.code === 'invalid_type' ? 'Request body must be a JSON object' : undefined;

/** A trimmed, non-empty string of at most `max` characters. */
const requiredText = (max: number) =>
  z
    .string({ error: (issue) => (issue.input === undefined ? 'is required' : 'must be a string') })
    .trim()
    .min(1, 'is required')
    .max(max, `must be at most ${max} characters`);

/**
 * A trimmed string of at most `max` characters, or null. Empty strings become null;
 * an absent field stays undefined (so PATCH can tell "leave as is" from "clear").
 */
const optionalText = (max: number) =>
  z
    .string({ error: 'must be a string or null' })
    .trim()
    .max(max, `must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value === undefined ? undefined : value || null));

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}

const lessonTitle = requiredText(LIMITS.lessonTitle);
const lessonType = z.enum(LESSON_TYPES, {
  error: (issue) =>
    issue.input === undefined ? 'is required' : `must be one of ${LESSON_TYPES.join(', ')}`,
});
// Field-level limits are the widest the column allows; per-type rules are in lessonProblems.
const lessonBody = optionalText(LIMITS.lessonBody);
const lessonUrl = optionalText(LIMITS.lessonUrl).refine(
  (value) => value == null || isHttpsUrl(value),
  'must be an absolute https URL',
);
const durationMinutes = z
  .number({ error: 'must be a number or null' })
  .int('must be a whole number')
  .min(1, `must be between 1 and ${LIMITS.lessonDurationMinutes}`)
  .max(LIMITS.lessonDurationMinutes, `must be between 1 and ${LIMITS.lessonDurationMinutes}`)
  .nullish();

/** A lesson as stored: every field present, absent optional fields as null. */
export interface LessonData {
  title: string;
  type: LessonType;
  body: string | null;
  url: string | null;
  durationMinutes: number | null;
}

/** The rules that depend on the lesson type. Used for create and for the merged PATCH result. */
export function lessonProblems(lesson: Pick<LessonData, 'type' | 'body' | 'url'>): Problem[] {
  const problems: Problem[] = [];
  if (lesson.type === 'text') {
    if (!lesson.body) problems.push({ path: ['body'], message: 'is required for text lessons' });
    if (lesson.url) problems.push({ path: ['url'], message: 'must be empty for text lessons' });
  } else {
    if (!lesson.url) {
      problems.push({ path: ['url'], message: `is required for ${lesson.type} lessons` });
    }
    if (lesson.body && lesson.body.length > LIMITS.lessonNotes) {
      problems.push({
        path: ['body'],
        message: `(notes) must be at most ${LIMITS.lessonNotes} characters for ${lesson.type} lessons`,
      });
    }
  }
  return problems;
}

export const createCourseSchema = z.strictObject(
  {
    title: requiredText(LIMITS.courseTitle),
    description: optionalText(LIMITS.courseDescription),
  },
  { error: bodyError },
);
export type CreateCourseData = z.output<typeof createCourseSchema>;

export const updateCourseSchema = z.strictObject(
  {
    title: requiredText(LIMITS.courseTitle).optional(),
    description: optionalText(LIMITS.courseDescription),
  },
  { error: bodyError },
);
export type UpdateCourseData = z.output<typeof updateCourseSchema>;

export const createLessonSchema = z
  .strictObject(
    { title: lessonTitle, type: lessonType, body: lessonBody, url: lessonUrl, durationMinutes },
    { error: bodyError },
  )
  .transform((input): LessonData => ({
    title: input.title,
    type: input.type,
    body: input.body ?? null,
    url: input.url ?? null,
    durationMinutes: input.durationMinutes ?? null,
  }))
  .superRefine((lesson, ctx) => {
    for (const { path, message } of lessonProblems(lesson)) {
      ctx.addIssue({ code: 'custom', path: [...path], message });
    }
  });

/** Absent fields are undefined (unchanged); the merged lesson is checked by the service. */
export const updateLessonSchema = z.strictObject(
  {
    title: lessonTitle.optional(),
    type: lessonType.optional(),
    body: lessonBody,
    url: lessonUrl,
    durationMinutes,
  },
  { error: bodyError },
);
export type UpdateLessonData = z.output<typeof updateLessonSchema>;

export const reorderLessonsSchema = z.strictObject(
  {
    lessonIds: z
      .array(z.string({ error: 'must be a lesson id' }), {
        error: (issue) =>
          issue.input === undefined ? 'is required' : 'must be an array of lesson ids',
      })
      .max(LIMITS.lessonsPerCourse, `must list at most ${LIMITS.lessonsPerCourse} lessons`)
      .transform((ids) => ids.map((id) => id.toLowerCase())),
  },
  { error: bodyError },
);
export type ReorderLessonsData = z.output<typeof reorderLessonsSchema>;
