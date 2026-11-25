import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../../api/client';
import { CoursePage } from './CoursePage';
import { makeCourse, makeLesson, renderRoute } from './test-utils';

function renderCourse() {
  return renderRoute(<CoursePage />, { path: '/courses/c1', pattern: '/courses/:courseId' });
}

describe('CoursePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists lessons in order and starts at the first one', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(
      makeCourse({
        lessons: [
          makeLesson({ id: 'l1', title: 'Welcome', durationMinutes: 5 }),
          makeLesson({ id: 'l2', title: 'Watch', type: 'video', position: 1 }),
        ],
      }),
    );

    renderCourse();

    expect(await screen.findByRole('heading', { name: 'Intro to Testing' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['1WelcomeText · 5 min', '2WatchVideo']);
    expect(screen.getByRole('link', { name: 'Start course' })).toHaveAttribute(
      'href',
      '/courses/c1/lessons/l1',
    );
    expect(screen.queryByRole('link', { name: 'Edit course' })).toBeNull();
    expect(screen.queryByText(/only authors see this draft/)).toBeNull();
  });

  it('marks drafts as a preview and offers editing to authors', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(
      makeCourse({ published: false, publishedAt: null, canEdit: true }),
    );

    renderCourse();

    expect(await screen.findByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Preview — only authors see this draft.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit course' })).toHaveAttribute(
      'href',
      '/manage/courses/c1',
    );
    expect(screen.queryByRole('link', { name: 'Start course' })).toBeNull();
    expect(screen.getByText('This course has no lessons yet.')).toBeInTheDocument();
  });

  it('shows "Course not found" for a 404 without retrying', async () => {
    const spy = vi.spyOn(api, 'course').mockRejectedValue(new ApiError(404, 'Course not found'));

    renderCourse();

    expect(await screen.findByRole('heading', { name: 'Course not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all courses' })).toHaveAttribute(
      'href',
      '/courses',
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
