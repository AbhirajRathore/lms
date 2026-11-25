import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, type InitialEntry } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CourseDetail, Lesson, ManagedCourseSummary } from '@lms/shared';

/** Render `ui` (usually `<Routes>`) inside a fresh QueryClient and a MemoryRouter at `route`. */
export function renderWithProviders(ui: ReactNode, route: InitialEntry) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

export function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'lesson-1',
    courseId: 'course-1',
    title: 'Welcome',
    type: 'text',
    body: 'Hello there',
    url: null,
    durationMinutes: 5,
    position: 0,
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<ManagedCourseSummary> = {}): ManagedCourseSummary {
  return {
    id: 'course-1',
    title: 'Intro to TypeScript',
    description: 'Types for JavaScript',
    published: false,
    lessonCount: 2,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-20T15:30:00.000Z',
    publishedAt: null,
    createdBy: { id: 'user-1', email: 'instructor@example.com' },
    ...overrides,
  };
}

export function makeCourse(overrides: Partial<CourseDetail> = {}): CourseDetail {
  const lessons = overrides.lessons ?? [
    makeLesson(),
    makeLesson({ id: 'lesson-2', title: 'Variables', position: 1, durationMinutes: null }),
    makeLesson({
      id: 'lesson-3',
      title: 'Demo video',
      type: 'video',
      body: null,
      url: 'https://example.com/demo.mp4',
      position: 2,
    }),
  ];
  return {
    ...makeSummary({ lessonCount: lessons.length }),
    canEdit: true,
    ...overrides,
    lessons,
  };
}
