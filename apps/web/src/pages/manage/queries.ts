import type { QueryClient } from '@tanstack/react-query';
import type { CourseDetail } from '@lms/shared';
import { ApiError } from '../../api/client';
import { COURSES_QUERY_KEY, courseQueryKey } from '../learn/courseQueries';

/** Query keys for the authoring screens. Everything sits under `['manage']`. */
export const manageKeys = {
  all: ['manage'] as const,
  list: () => ['manage', 'list'] as const,
  course: (id: string) => ['manage', 'course', id] as const,
};

/** Learner pages ('Preview as learner') cache the catalogue and course detail separately. */
function invalidateLearnerViews(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: COURSES_QUERY_KEY });
}

/** Store a course returned by a mutation and mark the course lists as stale. */
export async function cacheCourse(queryClient: QueryClient, course: CourseDetail): Promise<void> {
  queryClient.setQueryData(manageKeys.course(course.id), course);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: manageKeys.list() }),
    invalidateLearnerViews(queryClient),
  ]);
}

/** Refetch the open course and mark the course lists as stale (after lesson changes). */
export async function refreshManaged(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: manageKeys.all }),
    invalidateLearnerViews(queryClient),
  ]);
}

/** Forget a deleted course everywhere. */
export function forgetCourse(queryClient: QueryClient, courseId: string): Promise<void> {
  queryClient.removeQueries({ queryKey: manageKeys.course(courseId), exact: true });
  queryClient.removeQueries({ queryKey: courseQueryKey(courseId), exact: true });
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: manageKeys.list() }),
    invalidateLearnerViews(queryClient),
  ]).then(() => undefined);
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Retry network and server failures a few times, but never 4xx answers such as 404. */
export function retryServerErrors(failureCount: number, error: Error): boolean {
  return !(error instanceof ApiError && error.status < 500) && failureCount < 3;
}
