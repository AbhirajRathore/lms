import type { Role } from './roles.js';
import type { LessonType } from './lessons.js';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  version: string;
}

/** The signed-in user. `id` is the LMS database id (uuid), not the identity-provider subject. */
export interface CurrentUser {
  id: string;
  email: string;
  roles: Role[];
}

export interface UserRef {
  id: string;
  email: string;
}

/** A course as listed in the learner catalogue (published courses only). */
export interface CourseSummary {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  lessonCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A course as listed on the authoring screen (drafts included). */
export interface ManagedCourseSummary extends CourseSummary {
  publishedAt: string | null;
  createdBy: UserRef;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  type: LessonType;
  /** Text lessons: the body. Video/document lessons: optional notes. */
  body: string | null;
  /** Video/document lessons: https URL. */
  url: string | null;
  durationMinutes: number | null;
  /** 0-based, contiguous within the course. */
  position: number;
}

export interface CourseDetail extends ManagedCourseSummary {
  /** Ordered by position. */
  lessons: Lesson[];
  /** True when the signed-in user may edit this course (admin, or the instructor who created it). */
  canEdit: boolean;
}

export interface CreateCourseInput {
  title: string;
  description?: string | null;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string | null;
}

export interface LessonInput {
  title: string;
  type: LessonType;
  body?: string | null;
  url?: string | null;
  durationMinutes?: number | null;
}

export type UpdateLessonInput = Partial<LessonInput>;

export interface ReorderLessonsInput {
  /** Every lesson id of the course, exactly once, in the new order. */
  lessonIds: string[];
}

/** Error body returned by the API for 4xx/5xx responses. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
