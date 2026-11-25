import { flushSync } from 'react-dom';
import {
  LIMITS,
  isLessonType,
  type CourseDetail,
  type Lesson,
  type LessonInput,
  type LessonType,
} from '@lms/shared';

/**
 * Client-side copies of the API validation rules in docs/course-authoring.md.
 * The API stays the source of truth; these only give faster, field-level feedback.
 */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type Validated<T, K extends string> =
  { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

const count = (limit: number) => limit.toLocaleString();

function result<T, K extends string>(errors: FieldErrors<K>, value: () => T): Validated<T, K> {
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: value() };
}

/** Absolute `https:` URL with a host. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}

// --- Courses -------------------------------------------------------------------------------

export interface CourseFormValues {
  title: string;
  description: string;
}

export type CourseField = keyof CourseFormValues;

export interface CourseValues {
  title: string;
  description: string | null;
}

export function courseFormValues(course?: CourseDetail): CourseFormValues {
  return { title: course?.title ?? '', description: course?.description ?? '' };
}

export function validateCourse(values: CourseFormValues): Validated<CourseValues, CourseField> {
  const title = values.title.trim();
  const description = values.description.trim();
  const errors: FieldErrors<CourseField> = {};

  if (!title) errors.title = 'Enter a title.';
  else if (title.length > LIMITS.courseTitle) {
    errors.title = `Title must be ${count(LIMITS.courseTitle)} characters or fewer.`;
  }
  if (description.length > LIMITS.courseDescription) {
    errors.description = `Description must be ${count(LIMITS.courseDescription)} characters or fewer.`;
  }

  return result(errors, () => ({ title, description: description || null }));
}

// --- Lessons -------------------------------------------------------------------------------

export interface LessonFormValues {
  title: string;
  type: LessonType;
  /** Text lessons: the body. Video/document lessons: optional notes. */
  body: string;
  url: string;
  durationMinutes: string;
}

export type LessonField = keyof LessonFormValues;

export function lessonFormValues(lesson?: Lesson): LessonFormValues {
  return {
    title: lesson?.title ?? '',
    type: lesson?.type ?? 'text',
    body: lesson?.body ?? '',
    url: lesson?.url ?? '',
    durationMinutes: lesson?.durationMinutes?.toString() ?? '',
  };
}

/** Whole minutes in range, `null` when empty, `undefined` when invalid. */
function parseDuration(value: string): number | null | undefined {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return undefined;
  const minutes = Number(value);
  return minutes >= 1 && minutes <= LIMITS.lessonDurationMinutes ? minutes : undefined;
}

export function validateLesson(values: LessonFormValues): Validated<LessonInput, LessonField> {
  const title = values.title.trim();
  const body = values.body.trim();
  const url = values.url.trim();
  const { type } = values;
  const durationMinutes = parseDuration(values.durationMinutes.trim());
  const errors: FieldErrors<LessonField> = {};

  if (!title) errors.title = 'Enter a title.';
  else if (title.length > LIMITS.lessonTitle) {
    errors.title = `Title must be ${count(LIMITS.lessonTitle)} characters or fewer.`;
  }

  if (!isLessonType(type)) {
    errors.type = 'Choose a lesson type.';
  } else if (type === 'text') {
    if (!body) errors.body = 'Enter the lesson text.';
    else if (body.length > LIMITS.lessonBody) {
      errors.body = `Lesson text must be ${count(LIMITS.lessonBody)} characters or fewer.`;
    }
  } else {
    if (!url) errors.url = 'Enter a URL.';
    else if (url.length > LIMITS.lessonUrl) {
      errors.url = `URL must be ${count(LIMITS.lessonUrl)} characters or fewer.`;
    } else if (!isHttpsUrl(url)) {
      errors.url = 'Enter a full URL that starts with https://';
    }
    if (body.length > LIMITS.lessonNotes) {
      errors.body = `Notes must be ${count(LIMITS.lessonNotes)} characters or fewer.`;
    }
  }

  if (durationMinutes === undefined) {
    errors.durationMinutes = `Enter whole minutes from 1 to ${LIMITS.lessonDurationMinutes}, or leave it empty.`;
  }

  return result(errors, () => ({
    title,
    type,
    body: body || null,
    url: type === 'text' ? null : url,
    durationMinutes: durationMinutes ?? null,
  }));
}

/** Render the new errors now, then move focus to the first invalid control in the form. */
export function showErrors(form: HTMLFormElement, applyErrors: () => void): void {
  flushSync(applyErrors);
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
