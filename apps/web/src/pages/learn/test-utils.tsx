import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { CourseDetail, Lesson } from '@lms/shared';

/** Renders `element` at `path` (matched by `pattern`) with a fresh, non-retrying query client. */
export function renderRoute(
  element: ReactElement,
  { path, pattern }: { path: string; pattern: string },
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
          <Route path="*" element={<p>Other page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function makeLesson(overrides: Partial<Lesson> & Pick<Lesson, 'id'>): Lesson {
  return {
    courseId: 'c1',
    title: `Lesson ${overrides.id}`,
    type: 'text',
    body: 'Body',
    url: null,
    durationMinutes: null,
    position: 0,
    ...overrides,
  };
}

export function makeCourse(overrides: Partial<CourseDetail> = {}): CourseDetail {
  const lessons = overrides.lessons ?? [];
  return {
    id: 'c1',
    title: 'Intro to Testing',
    description: 'Learn to test.',
    published: true,
    lessonCount: lessons.length,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    publishedAt: '2026-11-01T00:00:00.000Z',
    createdBy: { id: 'u1', email: 'instructor@lms.local' },
    canEdit: false,
    lessons,
    ...overrides,
  };
}
