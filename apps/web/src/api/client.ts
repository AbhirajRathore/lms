import type {
  ApiErrorBody,
  CourseDetail,
  CourseSummary,
  CreateCourseInput,
  CurrentUser,
  HealthResponse,
  Lesson,
  LessonInput,
  ManagedCourseSummary,
  UpdateCourseInput,
  UpdateLessonInput,
} from '@lms/shared';
import { getDevToken } from './dev-auth';

const baseUrl = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// TODO: replace with the identity-provider session token once sign-in is wired up.
function authToken(): string | undefined {
  return import.meta.env.DEV ? getDevToken() : undefined;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    if (Array.isArray(body.message)) return body.message.join('; ');
    if (typeof body.message === 'string' && body.message) return body.message;
  } catch {
    // Not JSON: fall through to the status text.
  }
  return `${res.status} ${res.statusText}`.trim();
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = authToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

export const api = {
  health: () => request<HealthResponse>('GET', '/health'),
  me: () => request<CurrentUser>('GET', '/me'),

  /** Published courses (learner catalogue). */
  courses: () => request<CourseSummary[]>('GET', '/courses'),
  /** A course with its lessons. Drafts are only visible to people who can edit them. */
  course: (id: string) => request<CourseDetail>('GET', `/courses/${enc(id)}`),

  /** Authoring (admin + instructor). */
  manage: {
    list: () => request<ManagedCourseSummary[]>('GET', '/manage/courses'),
    get: (id: string) => request<CourseDetail>('GET', `/manage/courses/${enc(id)}`),
    create: (input: CreateCourseInput) => request<CourseDetail>('POST', '/manage/courses', input),
    update: (id: string, input: UpdateCourseInput) =>
      request<CourseDetail>('PATCH', `/manage/courses/${enc(id)}`, input),
    publish: (id: string) => request<CourseDetail>('POST', `/manage/courses/${enc(id)}/publish`),
    unpublish: (id: string) =>
      request<CourseDetail>('POST', `/manage/courses/${enc(id)}/unpublish`),
    remove: (id: string) => request<void>('DELETE', `/manage/courses/${enc(id)}`),
    addLesson: (id: string, input: LessonInput) =>
      request<Lesson>('POST', `/manage/courses/${enc(id)}/lessons`, input),
    updateLesson: (id: string, lessonId: string, input: UpdateLessonInput) =>
      request<Lesson>('PATCH', `/manage/courses/${enc(id)}/lessons/${enc(lessonId)}`, input),
    removeLesson: (id: string, lessonId: string) =>
      request<void>('DELETE', `/manage/courses/${enc(id)}/lessons/${enc(lessonId)}`),
    reorderLessons: (id: string, lessonIds: string[]) =>
      request<Lesson[]>('PUT', `/manage/courses/${enc(id)}/lessons/order`, { lessonIds }),
  },
};
