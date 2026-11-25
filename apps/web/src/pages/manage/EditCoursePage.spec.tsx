import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import type { Lesson } from '@lms/shared';
import { api, ApiError } from '../../api/client';
import { EditCoursePage } from './EditCoursePage';
import { ManageCoursesPage } from './ManageCoursesPage';
import { manageKeys } from './queries';
import { makeCourse, makeLesson, makeSummary, renderWithProviders } from './test-utils';

function renderPage(courseId = 'course-1', list = <p>Course list</p>) {
  return renderWithProviders(
    <Routes>
      <Route path="/manage/courses/:courseId" element={<EditCoursePage />} />
      <Route path="/manage" element={list} />
    </Routes>,
    `/manage/courses/${courseId}`,
  );
}

async function findLessonRows() {
  const list = await screen.findByRole('list', { name: 'Lessons' });
  return within(list).getAllByRole('listitem');
}

function addLessonForm() {
  return screen.getByRole('form', { name: 'Add a lesson' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EditCoursePage', () => {
  it('shows the course details and its ordered lessons', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Intro to TypeScript' }),
    ).toBeInTheDocument();
    const details = screen.getByRole('form', { name: 'Details' });
    expect(within(details).getByLabelText('Title')).toHaveValue('Intro to TypeScript');
    expect(within(details).getByLabelText(/Description/)).toHaveValue('Types for JavaScript');

    const rows = await findLessonRows();
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^1Welcome.*Text.*5 min/),
      expect.stringMatching(/^2Variables.*Text/),
      expect.stringMatching(/^3Demo video.*Video.*5 min/),
    ]);
    expect(screen.getByRole('link', { name: 'Preview as learner' })).toHaveAttribute(
      'href',
      '/courses/course-1',
    );
  });

  it('shows a friendly message when the course is not found', async () => {
    vi.spyOn(api.manage, 'get').mockRejectedValue(new ApiError(404, 'Course not found'));
    renderPage('missing');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Course not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Manage courses' })).toHaveAttribute(
      'href',
      '/manage',
    );
  });

  it('saves the course details', async () => {
    const course = makeCourse();
    vi.spyOn(api.manage, 'get').mockResolvedValue(course);
    const update = vi
      .spyOn(api.manage, 'update')
      .mockResolvedValue({ ...course, title: 'Renamed', description: null });
    renderPage();

    const details = await screen.findByRole('form', { name: 'Details' });
    fireEvent.change(within(details).getByLabelText('Title'), { target: { value: ' Renamed ' } });
    fireEvent.change(within(details).getByLabelText(/Description/), { target: { value: '  ' } });
    fireEvent.click(within(details).getByRole('button', { name: 'Save details' }));

    expect(await within(details).findByText('Details saved.')).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith('course-1', { title: 'Renamed', description: null });
    expect(screen.getByRole('heading', { level: 1, name: 'Renamed' })).toBeInTheDocument();
  });

  it('disables Publish with a hint when the course has no lessons', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse({ lessons: [] }));
    renderPage();

    const publish = await screen.findByRole('button', { name: 'Publish' });
    expect(publish).toBeDisabled();
    expect(publish).toHaveAccessibleDescription('Add at least one lesson before publishing.');
    expect(screen.getByText('No lessons yet. Add the first one below.')).toBeInTheDocument();
  });

  it('publishes a course that has lessons', async () => {
    const course = makeCourse();
    vi.spyOn(api.manage, 'get').mockResolvedValue(course);
    const publish = vi.spyOn(api.manage, 'publish').mockResolvedValue({
      ...course,
      published: true,
      publishedAt: '2026-11-25T08:00:00.000Z',
    });
    renderPage();

    const button = await screen.findByRole('button', { name: 'Publish' });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    expect(await screen.findByText('Course published.')).toBeInTheDocument();
    expect(publish).toHaveBeenCalledWith('course-1');
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete course' })).not.toBeInTheDocument();
  });

  it('deletes a draft after confirmation and returns to the list', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const remove = vi.spyOn(api.manage, 'remove').mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete course' }));

    expect(await screen.findByText('Course list')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('course-1');
  });

  it('drops a deleted course from the cached list before the list refetches', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(api.manage, 'remove').mockResolvedValue(undefined);
    // The list refetch never answers, so only the cached list is on screen.
    vi.spyOn(api.manage, 'list').mockReturnValue(new Promise(() => {}));
    const { queryClient } = renderPage('course-1', <ManageCoursesPage />);
    queryClient.setQueryData(manageKeys.list(), [
      makeSummary(),
      makeSummary({ id: 'course-2', title: 'Advanced React' }),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete course' }));

    expect(await screen.findByText('Deleted “Intro to TypeScript”.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Advanced React' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Intro to TypeScript' })).not.toBeInTheDocument();
    expect(queryClient.getQueryData(manageKeys.course('course-1'))).toBeUndefined();
  });

  it('keeps the page in sync when the URL has an upper-case course id', async () => {
    const course = makeCourse();
    const get = vi.spyOn(api.manage, 'get').mockResolvedValue(course);
    vi.spyOn(api.manage, 'publish').mockResolvedValue({
      ...course,
      published: true,
      publishedAt: '2026-11-25T08:00:00.000Z',
    });
    // The API accepts any letter case and answers with the lower-case id.
    renderPage('COURSE-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('course-1');
  });

  it('does not delete when the confirmation is cancelled', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const remove = vi.spyOn(api.manage, 'remove');
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete course' }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('moves a lesson down by sending the swapped order, disabling moves while saving', async () => {
    const course = makeCourse();
    vi.spyOn(api.manage, 'get').mockResolvedValue(course);
    let finish: (lessons: Lesson[]) => void = () => {};
    const reorder = vi.spyOn(api.manage, 'reorderLessons').mockReturnValue(
      new Promise<Lesson[]>((resolve) => {
        finish = resolve;
      }),
    );
    renderPage();

    const rows = await findLessonRows();
    expect(within(rows[0]!).getByRole('button', { name: /Move up/ })).toBeDisabled();
    expect(within(rows[2]!).getByRole('button', { name: /Move down/ })).toBeDisabled();

    fireEvent.click(within(rows[0]!).getByRole('button', { name: 'Move down: Welcome' }));

    await waitFor(() =>
      expect(reorder).toHaveBeenCalledWith('course-1', ['lesson-2', 'lesson-1', 'lesson-3']),
    );
    for (const button of screen.getAllByRole('button', { name: /Move (up|down)/ })) {
      expect(button).toBeDisabled();
    }

    const [first, second, third] = course.lessons;
    finish([
      { ...second!, position: 0 },
      { ...first!, position: 1 },
      { ...third!, position: 2 },
    ]);
    expect(
      await screen.findByText('Moved “Welcome” to position 2.', undefined, { timeout: 2000 }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move down: Welcome' })).toBeEnabled(),
    );
  });

  it('reloads the lessons when a reorder is rejected', async () => {
    const get = vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    vi.spyOn(api.manage, 'reorderLessons').mockRejectedValue(
      new ApiError(400, 'lessonIds must list every lesson of the course exactly once'),
    );
    renderPage();

    const rows = await findLessonRows();
    fireEvent.click(within(rows[0]!).getByRole('button', { name: 'Move down: Welcome' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'lessonIds must list every lesson of the course exactly once',
    );
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it('blocks a text lesson without a body and a video with an http URL', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    const addLesson = vi.spyOn(api.manage, 'addLesson');
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to TypeScript' });
    const form = addLessonForm();
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Generics' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add lesson' }));

    const body = within(form).getByLabelText('Lesson text');
    expect(body).toHaveAttribute('aria-invalid', 'true');
    expect(body).toHaveAccessibleDescription(/Enter the lesson text\./);
    expect(body).toHaveFocus();
    expect(addLesson).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText('Type'), { target: { value: 'video' } });
    fireEvent.change(within(form).getByLabelText('Video URL'), {
      target: { value: 'http://example.com/clip.mp4' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Add lesson' }));

    const url = within(form).getByLabelText('Video URL');
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(url).toHaveAccessibleDescription(/starts with https:\/\//);
    expect(addLesson).not.toHaveBeenCalled();
  });

  it('clears body and URL errors when the lesson type changes', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to TypeScript' });
    const form = addLessonForm();
    fireEvent.click(within(form).getByRole('button', { name: 'Add lesson' }));
    expect(within(form).getByLabelText('Lesson text')).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(within(form).getByLabelText('Type'), { target: { value: 'video' } });

    // The text-lesson error must not move onto the Notes field.
    expect(within(form).getByLabelText(/Notes/)).not.toHaveAttribute('aria-invalid');
    expect(within(form).queryByText('Enter the lesson text.')).not.toBeInTheDocument();
    expect(within(form).getByLabelText('Video URL')).not.toHaveAttribute('aria-invalid');
  });

  it('rejects a duration that is not a whole number instead of dropping it', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    const addLesson = vi.spyOn(api.manage, 'addLesson');
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to TypeScript' });
    const form = addLessonForm();
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Generics' } });
    fireEvent.change(within(form).getByLabelText('Lesson text'), { target: { value: 'Body' } });
    fireEvent.change(within(form).getByLabelText(/Duration/), { target: { value: 'ten' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add lesson' }));

    expect(within(form).getByLabelText(/Duration/)).toHaveAttribute('aria-invalid', 'true');
    expect(addLesson).not.toHaveBeenCalled();
  });

  it('rejects a duration outside 1 to 600 minutes', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    const addLesson = vi.spyOn(api.manage, 'addLesson');
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to TypeScript' });
    const form = addLessonForm();
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Generics' } });
    fireEvent.change(within(form).getByLabelText('Lesson text'), { target: { value: 'Body' } });
    fireEvent.change(within(form).getByLabelText(/Duration/), { target: { value: '601' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add lesson' }));

    expect(within(form).getByLabelText(/Duration/)).toHaveAttribute('aria-invalid', 'true');
    expect(addLesson).not.toHaveBeenCalled();
  });

  it('adds a valid video lesson', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    const addLesson = vi.spyOn(api.manage, 'addLesson').mockResolvedValue(
      makeLesson({
        id: 'lesson-4',
        title: 'Generics',
        type: 'video',
        url: 'https://example.com/clip.mp4',
        body: null,
        durationMinutes: 12,
        position: 3,
      }),
    );
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to TypeScript' });
    const form = addLessonForm();
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'Generics' } });
    fireEvent.change(within(form).getByLabelText('Type'), { target: { value: 'video' } });
    fireEvent.change(within(form).getByLabelText('Video URL'), {
      target: { value: 'https://example.com/clip.mp4' },
    });
    fireEvent.change(within(form).getByLabelText(/Duration/), { target: { value: '12' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add lesson' }));

    expect(await screen.findByText('Added “Generics”.')).toBeInTheDocument();
    expect(addLesson).toHaveBeenCalledWith('course-1', {
      title: 'Generics',
      type: 'video',
      body: null,
      url: 'https://example.com/clip.mp4',
      durationMinutes: 12,
    });
    // The form is cleared for the next lesson.
    expect(within(addLessonForm()).getByLabelText('Title')).toHaveValue('');
  });

  it('shows the API message when adding a lesson fails', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    vi.spyOn(api.manage, 'addLesson').mockRejectedValue(
      new ApiError(400, 'A course can hold at most 200 lessons'),
    );
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Intro to TypeScript' });
    const form = addLessonForm();
    fireEvent.change(within(form).getByLabelText('Title'), { target: { value: 'One more' } });
    fireEvent.change(within(form).getByLabelText('Lesson text'), { target: { value: 'Text' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add lesson' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'A course can hold at most 200 lessons',
    );
  });

  it('edits a lesson inline', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    const updateLesson = vi
      .spyOn(api.manage, 'updateLesson')
      .mockResolvedValue(makeLesson({ title: 'Welcome aboard' }));
    renderPage();

    const rows = await findLessonRows();
    fireEvent.click(within(rows[0]!).getByRole('button', { name: 'Edit: Welcome' }));
    const form = screen.getByRole('form', { name: 'Edit lesson 1: Welcome' });
    const title = within(form).getByLabelText('Title');
    expect(title).toHaveFocus();
    fireEvent.change(title, { target: { value: 'Welcome aboard' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save lesson' }));

    expect(await screen.findByText('Saved “Welcome aboard”.')).toBeInTheDocument();
    expect(updateLesson).toHaveBeenCalledWith('course-1', 'lesson-1', {
      title: 'Welcome aboard',
      type: 'text',
      body: 'Hello there',
      url: null,
      durationMinutes: 5,
    });
    expect(screen.queryByRole('form', { name: /Edit lesson/ })).not.toBeInTheDocument();
    // Focus goes back to the row's Edit button once the save has settled.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit: Welcome' })).toHaveFocus(),
    );
  });

  it('allows only one lesson editor at a time so unsaved edits are not dropped', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    renderPage();

    const rows = await findLessonRows();
    fireEvent.click(within(rows[0]!).getByRole('button', { name: 'Edit: Welcome' }));
    expect(screen.getByRole('button', { name: 'Edit: Variables' })).toBeDisabled();

    const form = screen.getByRole('form', { name: 'Edit lesson 1: Welcome' });
    fireEvent.click(within(form).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Edit: Variables' })).toBeEnabled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Edit: Welcome' })).toHaveFocus(),
    );
  });

  it('deletes a lesson after confirmation', async () => {
    vi.spyOn(api.manage, 'get').mockResolvedValue(makeCourse());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const removeLesson = vi.spyOn(api.manage, 'removeLesson').mockResolvedValue(undefined);
    renderPage();

    const rows = await findLessonRows();
    fireEvent.click(within(rows[1]!).getByRole('button', { name: 'Delete: Variables' }));

    expect(await screen.findByText('Deleted “Variables”.')).toBeInTheDocument();
    expect(removeLesson).toHaveBeenCalledWith('course-1', 'lesson-2');
  });
});
