export const LESSON_TYPES = ['text', 'video', 'document'] as const;

export type LessonType = (typeof LESSON_TYPES)[number];

export function isLessonType(value: unknown): value is LessonType {
  return typeof value === 'string' && (LESSON_TYPES as readonly string[]).includes(value);
}

/** Limits shared by API validation and web forms. */
export const LIMITS = {
  courseTitle: 200,
  courseDescription: 2000,
  lessonTitle: 200,
  lessonBody: 50_000,
  lessonNotes: 5000,
  lessonUrl: 2000,
  lessonDurationMinutes: 600,
  lessonsPerCourse: 200,
} as const;
