import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation, type InitialEntry } from 'react-router';
import { api, ApiError } from '../../api/client';
import { ManageCoursesPage } from './ManageCoursesPage';
import { makeCourse, makeSummary, renderWithProviders } from './test-utils';

/** Shows the router's history state so tests can check it. */
function HistoryState() {
  return <output data-testid="history-state">{JSON.stringify(useLocation().state)}</output>;
}

function renderPage(route: InitialEntry = '/manage') {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/manage" element={<ManageCoursesPage />} />
        <Route path="/manage/courses/:courseId" element={<p>Edit page</p>} />
      </Routes>
      <HistoryState />
    </>,
    route,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ManageCoursesPage', () => {
  it('lists the courses with status, lesson count, last updated and creator', async () => {
    vi.spyOn(api.manage, 'list').mockResolvedValue([
      makeSummary(),
      makeSummary({
        id: 'course-2',
        title: 'Advanced React',
        published: true,
        publishedAt: '2026-11-21T10:00:00.000Z',
        lessonCount: 7,
        createdBy: { id: 'user-2', email: 'admin@example.com' },
      }),
    ]);
    renderPage();

    const link = await screen.findByRole('link', { name: 'Intro to TypeScript' });
    expect(link).toHaveAttribute('href', '/manage/courses/course-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Manage courses' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const draft = within(rows[0]!);
    expect(draft.getByText('Draft')).toBeInTheDocument();
    expect(draft.getByText('2')).toBeInTheDocument();
    expect(draft.getByText('instructor@example.com')).toBeInTheDocument();
    expect(draft.getByRole('time')).toHaveAttribute('datetime', '2026-11-20T15:30:00.000Z');

    const published = within(rows[1]!);
    expect(published.getByRole('link', { name: 'Advanced React' })).toBeInTheDocument();
    expect(published.getByText('Published')).toBeInTheDocument();
    expect(published.getByText('7')).toBeInTheDocument();
    expect(published.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('shows an empty state when there are no courses', async () => {
    vi.spyOn(api.manage, 'list').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No courses yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the error when loading fails, without retrying a 4xx answer', async () => {
    const list = vi
      .spyOn(api.manage, 'list')
      .mockRejectedValue(new ApiError(403, 'Forbidden resource'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden resource');
    expect(list).toHaveBeenCalledOnce();
  });

  it('shows a message passed from the previous page, then drops it from history', async () => {
    vi.spyOn(api.manage, 'list').mockResolvedValue([]);
    renderPage({ pathname: '/manage', state: { status: 'Deleted “Old course”.' } });

    // Filled in after mount so screen readers announce it; focus starts at the heading.
    expect(await screen.findByText('Deleted “Old course”.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Manage courses' })).toHaveFocus();
    // A reload or Back/Forward must not show the message again.
    await waitFor(() => expect(screen.getByTestId('history-state')).toHaveTextContent('null'));
    expect(screen.getByText('Deleted “Old course”.')).toBeInTheDocument();
  });

  it('creates a course and opens its edit page', async () => {
    vi.spyOn(api.manage, 'list').mockResolvedValue([]);
    const create = vi
      .spyOn(api.manage, 'create')
      .mockResolvedValue(makeCourse({ id: 'new-course', title: 'Fresh course', lessons: [] }));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'New course' }));
    const form = screen.getByRole('form', { name: 'New course' });
    fireEvent.change(within(form).getByLabelText('Title'), {
      target: { value: '  Fresh course ' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Create course' }));

    expect(await screen.findByText('Edit page')).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith({ title: 'Fresh course', description: null });
  });

  it('requires a title before creating', async () => {
    vi.spyOn(api.manage, 'list').mockResolvedValue([]);
    const create = vi.spyOn(api.manage, 'create');
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'New course' }));
    const form = screen.getByRole('form', { name: 'New course' });
    fireEvent.click(within(form).getByRole('button', { name: 'Create course' }));

    const title = within(form).getByLabelText('Title');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Enter a title.');
    expect(title).toHaveFocus();
    expect(create).not.toHaveBeenCalled();
  });

  it('shows the API error when creating fails', async () => {
    vi.spyOn(api.manage, 'list').mockResolvedValue([]);
    vi.spyOn(api.manage, 'create').mockRejectedValue(
      new ApiError(400, 'title must be 200 characters or fewer'),
    );
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'New course' }));
    const form = screen.getByRole('form', { name: 'New course' });
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Course' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Create course' }));

    await waitFor(() =>
      expect(within(form).getByRole('alert')).toHaveTextContent(
        'title must be 200 characters or fewer',
      ),
    );
  });
});
