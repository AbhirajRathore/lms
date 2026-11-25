import { useQuery } from '@tanstack/react-query';
import type { LessonType } from '@lms/shared';
import { ApiError, api } from '../../api/client';

/** Catalogue key; course details sit under it so invalidating ['courses'] refreshes both. */
export const COURSES_QUERY_KEY = ['courses'] as const;

export function courseQueryKey(courseId: string) {
  return [...COURSES_QUERY_KEY, courseId] as const;
}

/** Retry network/server errors, but not 4xx answers such as 404 (they won't change). */
function retryUnlessClientError(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 3;
}

/** Published courses for the catalogue. */
export function useCourses() {
  return useQuery({
    queryKey: COURSES_QUERY_KEY,
    queryFn: () => api.courses(),
    retry: retryUnlessClientError,
  });
}

/** A course with its lessons. CoursePage and LessonPage share this cache entry. */
export function useCourse(courseId: string) {
  return useQuery({
    queryKey: courseQueryKey(courseId),
    queryFn: () => api.course(courseId),
    retry: retryUnlessClientError,
  });
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  text: 'Text',
  video: 'Video',
  document: 'Document',
};

export function lessonTypeLabel(type: LessonType): string {
  return LESSON_TYPE_LABELS[type];
}

/** "45 min", "1 h", "1 h 30 min"; null when there is no duration. */
export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function lessonCountLabel(count: number): string {
  return count === 1 ? '1 lesson' : `${count} lessons`;
}
