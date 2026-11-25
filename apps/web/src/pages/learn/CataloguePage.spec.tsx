import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../../api/client';
import { CataloguePage } from './CataloguePage';
import { renderRoute } from './test-utils';

function renderCatalogue() {
  return renderRoute(<CataloguePage />, { path: '/courses', pattern: '/courses' });
}

describe('CataloguePage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists published courses with their lesson counts', async () => {
    vi.spyOn(api, 'courses').mockResolvedValue([
      {
        id: 'c1',
        title: 'Intro to Testing',
        description: 'Learn to test.',
        published: true,
        lessonCount: 3,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
      {
        id: 'c2',
        title: 'Advanced Testing',
        description: null,
        published: true,
        lessonCount: 1,
        createdAt: '2026-11-02T00:00:00.000Z',
        updatedAt: '2026-11-02T00:00:00.000Z',
      },
    ]);

    renderCatalogue();

    const first = await screen.findByRole('link', { name: 'Intro to Testing' });
    expect(first).toHaveAttribute('href', '/courses/c1');
    expect(screen.getByRole('link', { name: 'Advanced Testing' })).toHaveAttribute(
      'href',
      '/courses/c2',
    );
    expect(screen.getByText('Learn to test.')).toBeInTheDocument();
    expect(screen.getByText('3 lessons')).toBeInTheDocument();
    expect(screen.getByText('1 lesson')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is published', async () => {
    vi.spyOn(api, 'courses').mockResolvedValue([]);

    renderCatalogue();

    expect(await screen.findByText('No courses have been published yet.')).toBeInTheDocument();
  });

  it('shows an alert at once when the courses cannot be loaded', async () => {
    const spy = vi.spyOn(api, 'courses').mockRejectedValue(new ApiError(401, 'Unauthorized'));

    renderCatalogue();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Couldn’t load courses: Unauthorized',
    );
    // 4xx answers are not retried, so a signed-out user isn't left on "Loading…" for seconds.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
