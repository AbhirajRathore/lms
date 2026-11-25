import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { ManagedCourseSummary } from '@lms/shared';
import { api } from '../../api/client';
import { formatDateTime } from './format';
import { NewCourseForm } from './NewCourseForm';
import { manageKeys, retryServerErrors } from './queries';
import { StatusBadge } from './StatusBadge';
import './manage.css';

/** A one-off message passed in navigation state, e.g. after deleting a course. */
function statusFromState(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'status' in state) {
    return typeof state.status === 'string' ? state.status : '';
  }
  return '';
}

export function ManageCoursesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Read once, then drop it from history so a reload or Back/Forward doesn't show it again.
  const [arrivalStatus] = useState(() => statusFromState(location.state));
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const newCourseButton = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Screen readers only announce a live region when its text changes after it is on the page,
  // so fill it in after mount. The control that had focus (e.g. Delete) is gone: start at the heading.
  useEffect(() => {
    if (!arrivalStatus) return;
    headingRef.current?.focus();
    const timer = window.setTimeout(() => setStatus(arrivalStatus), 100);
    return () => window.clearTimeout(timer);
  }, [arrivalStatus]);

  useEffect(() => {
    if (statusFromState(location.state)) {
      void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location, navigate]);

  function closeForm() {
    flushSync(() => setCreating(false));
    newCourseButton.current?.focus();
  }

  return (
    <div className="manage stack">
      <div className="page-header">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            Manage courses
          </h1>
          <p className="muted">Create courses, add lessons and publish them for learners.</p>
        </div>
        {!creating && (
          <button
            type="button"
            ref={newCourseButton}
            className="btn btn-primary"
            onClick={() => setCreating(true)}
          >
            New course
          </button>
        )}
      </div>

      <p role="status" className="manage-status">
        {status}
      </p>

      {creating && <NewCourseForm onCancel={closeForm} />}

      <CourseList />
    </div>
  );
}

function CourseList() {
  const courses = useQuery({
    queryKey: manageKeys.list(),
    queryFn: () => api.manage.list(),
    retry: retryServerErrors,
  });

  if (courses.isPending) {
    return (
      <p role="status" className="muted">
        Loading courses…
      </p>
    );
  }
  if (courses.isError) {
    return (
      <div role="alert" className="alert row">
        <span>Could not load your courses: {courses.error.message}</span>
        <button type="button" className="btn btn-sm" onClick={() => void courses.refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (courses.data.length === 0) {
    return (
      <div className="empty">
        <p>No courses yet.</p>
        <p>Choose “New course” to create your first one.</p>
      </div>
    );
  }
  return <CourseTable courses={courses.data} />;
}

function CourseTable({ courses }: { courses: ManagedCourseSummary[] }) {
  return (
    <div className="card manage-table-wrap">
      <table className="table manage-courses">
        <caption className="visually-hidden">Courses you can edit</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Status</th>
            <th scope="col">Lessons</th>
            <th scope="col">Last updated</th>
            <th scope="col">Created by</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id}>
              <th scope="row">
                <Link to={`/manage/courses/${course.id}`}>{course.title}</Link>
              </th>
              <td>
                <StatusBadge published={course.published} />
              </td>
              <td>{course.lessonCount}</td>
              <td>
                <time dateTime={course.updatedAt}>{formatDateTime(course.updatedAt)}</time>
              </td>
              <td className="manage-email">{course.createdBy.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
