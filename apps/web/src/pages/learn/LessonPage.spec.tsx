import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../../api/client';
import { LessonPage } from './LessonPage';
import { makeCourse, makeLesson, renderRoute } from './test-utils';

const course = makeCourse({
  lessons: [
    makeLesson({ id: 'l1', title: 'Welcome', position: 0 }),
    makeLesson({ id: 'l2', title: 'Basics', position: 1, durationMinutes: 90 }),
    makeLesson({ id: 'l3', title: 'Wrap-up', position: 2 }),
  ],
});

function renderLesson(lessonId: string) {
  return renderRoute(<LessonPage />, {
    path: `/courses/c1/lessons/${lessonId}`,
    pattern: '/courses/:courseId/lessons/:lessonId',
  });
}

describe('LessonPage', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links to the previous and next lessons', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(course);

    renderLesson('l2');

    expect(await screen.findByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    expect(api.course).toHaveBeenCalledWith('c1');
    expect(screen.getByText(/Lesson 2 of 3/)).toHaveTextContent(
      'Lesson 2 of 3 · Text · 1 h 30 min',
    );
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute(
      'href',
      '/courses/c1/lessons/l1',
    );
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      '/courses/c1/lessons/l3',
    );
    expect(screen.getByRole('link', { name: 'Back to course' })).toHaveAttribute(
      'href',
      '/courses/c1',
    );
    expect(screen.getByRole('link', { name: 'Intro to Testing' })).toHaveAttribute(
      'href',
      '/courses/c1',
    );
  });

  it('has no previous link on the first lesson and no next link on the last', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(course);

    const first = renderLesson('l1');
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Previous/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      '/courses/c1/lessons/l2',
    );
    first.unmount();

    renderLesson('l3');
    expect(await screen.findByRole('heading', { name: 'Wrap-up' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Next/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute(
      'href',
      '/courses/c1/lessons/l2',
    );
  });

  it('gives the next video lesson a fresh player instead of reusing the iframe', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(
      makeCourse({
        lessons: [
          makeLesson({
            id: 'v1',
            title: 'Video one',
            type: 'video',
            url: 'https://youtu.be/dQw4w9WgXcQ',
          }),
          makeLesson({
            id: 'v2',
            title: 'Video two',
            type: 'video',
            url: 'https://youtu.be/aaaaaaaaaaa',
            position: 1,
          }),
        ],
      }),
    );

    renderLesson('v1');
    const firstFrame = await screen.findByTitle('Video one');

    fireEvent.click(screen.getByRole('link', { name: /Next/ }));

    const secondFrame = await screen.findByTitle('Video two');
    expect(secondFrame).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/aaaaaaaaaaa',
    );
    expect(secondFrame).not.toBe(firstFrame);
  });

  it('shows a not-found message for an unknown lesson', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(course);

    renderLesson('missing');

    expect(await screen.findByRole('heading', { name: 'Lesson not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to course' })).toHaveAttribute(
      'href',
      '/courses/c1',
    );
  });

  it('shows a not-found message when the course is missing', async () => {
    vi.spyOn(api, 'course').mockRejectedValue(new ApiError(404, 'Course not found'));

    renderLesson('l1');

    expect(await screen.findByRole('heading', { name: 'Course not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all courses' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });

  it('finds a lesson whose id is in a different letter case', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(course);
    renderLesson('L2');
    expect(await screen.findByRole('heading', { name: 'Basics' })).toBeInTheDocument();
  });

  it('moves focus to the new lesson title after Next', async () => {
    vi.spyOn(api, 'course').mockResolvedValue(course);
    renderLesson('l2');

    fireEvent.click(await screen.findByRole('link', { name: /Next/ }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Wrap-up' });
    expect(heading).toHaveFocus();
  });
});
