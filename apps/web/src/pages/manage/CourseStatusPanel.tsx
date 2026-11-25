import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CourseDetail, ManagedCourseSummary } from '@lms/shared';
import { api } from '../../api/client';
import { formatDateTime } from './format';
import { cacheCourse, forgetCourse, manageKeys } from './queries';
import { StatusBadge } from './StatusBadge';

/** Publish / unpublish, learner preview and delete. */
export function CourseStatusPanel({ course }: { course: CourseDetail }) {
  const headingId = useId();
  const publishHintId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const setPublished = useMutation({
    mutationFn: (publish: boolean) =>
      publish ? api.manage.publish(course.id) : api.manage.unpublish(course.id),
    onSuccess: (updated) => {
      void cacheCourse(queryClient, updated);
      setMessage(
        updated.published
          ? 'Course published.'
          : 'Course unpublished. Learners can no longer see it.',
      );
    },
  });

  const remove = useMutation({
    mutationFn: () => api.manage.remove(course.id),
    onSuccess: () => {
      // The list page shows its cached rows while it refetches: drop the deleted course now.
      queryClient.setQueryData<ManagedCourseSummary[]>(manageKeys.list(), (list) =>
        list?.filter((item) => item.id !== course.id),
      );
      void forgetCourse(queryClient, course.id);
      void navigate('/manage', { state: { status: `Deleted “${course.title}”.` } });
    },
  });

  const busy = setPublished.isPending || remove.isPending;
  const noLessons = course.lessons.length === 0;
  const error = setPublished.error ?? remove.error;

  function togglePublished() {
    setMessage('');
    remove.reset();
    setPublished.mutate(!course.published);
  }

  function deleteCourse() {
    const confirmed = window.confirm(
      `Delete “${course.title}” and all its lessons? This cannot be undone.`,
    );
    if (!confirmed) return;
    setMessage('');
    setPublished.reset();
    remove.mutate();
  }

  return (
    <section className="card stack" aria-labelledby={headingId}>
      <h2 id={headingId}>Status</h2>
      <p className="row manage-status-line">
        <StatusBadge published={course.published} />
        <span className="muted">
          {course.published && course.publishedAt
            ? `Published ${formatDateTime(course.publishedAt)}. Learners can see it.`
            : 'Draft. Only admins and the course author can see it.'}
        </span>
      </p>

      <div className="row">
        {course.published ? (
          <button type="button" className="btn" disabled={busy} onClick={togglePublished}>
            {setPublished.isPending ? 'Unpublishing…' : 'Unpublish'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || noLessons}
            aria-describedby={noLessons ? publishHintId : undefined}
            onClick={togglePublished}
          >
            {setPublished.isPending ? 'Publishing…' : 'Publish'}
          </button>
        )}
        <Link className="btn" to={`/courses/${course.id}`}>
          Preview as learner
        </Link>
        <span className="spacer" />
        {!course.published && (
          <button type="button" className="btn btn-danger" disabled={busy} onClick={deleteCourse}>
            {remove.isPending ? 'Deleting…' : 'Delete course'}
          </button>
        )}
      </div>

      {!course.published && noLessons && (
        <p id={publishHintId} className="manage-hint">
          Add at least one lesson before publishing.
        </p>
      )}
      {course.published && (
        <p className="manage-hint">Unpublish the course if you want to delete it.</p>
      )}

      <p role="status" className="manage-status">
        {message}
      </p>
      {error && (
        <p role="alert" className="alert">
          {error.message}
        </p>
      )}
    </section>
  );
}
