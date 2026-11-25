import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { CourseDetailsForm } from './CourseDetailsForm';
import { CourseStatusPanel } from './CourseStatusPanel';
import { formatDateTime } from './format';
import { LessonsSection } from './LessonsSection';
import { isNotFound, manageKeys, retryServerErrors } from './queries';
import { StatusBadge } from './StatusBadge';
import './manage.css';

export function EditCoursePage() {
  // The API accepts ids in any letter case and answers with the lower-case id. Mutations cache
  // their result under that id, so the page must read the same key.
  const courseId = (useParams().courseId ?? '').toLowerCase();
  const query = useQuery({
    queryKey: manageKeys.course(courseId),
    queryFn: () => api.manage.get(courseId),
    retry: retryServerErrors,
  });
  const { data: course, error } = query;

  if (isNotFound(error)) {
    return (
      <div className="manage stack">
        <h1>Course not found</h1>
        <p>This course doesn’t exist any more, or you don’t have access to edit it.</p>
        <p>
          <Link to="/manage">Back to Manage courses</Link>
        </p>
      </div>
    );
  }

  // A failed background refetch keeps showing the course we already have.
  if (error && !course) {
    return (
      <div className="manage stack">
        <div role="alert" className="alert row">
          <span>Could not load the course: {error.message}</span>
          <button type="button" className="btn btn-sm" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
        <p>
          <Link to="/manage">Back to Manage courses</Link>
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <p role="status" className="muted">
        Loading course…
      </p>
    );
  }

  return (
    // Keyed by id so form state resets when switching between courses.
    <div className="manage stack" key={course.id}>
      <p className="manage-back">
        <Link to="/manage">← All courses</Link>
      </p>
      <div className="page-header">
        <div>
          <h1>{course.title}</h1>
          <p className="muted">
            Last updated <time dateTime={course.updatedAt}>{formatDateTime(course.updatedAt)}</time>{' '}
            · created by {course.createdBy.email}
          </p>
        </div>
        <StatusBadge published={course.published} />
      </div>

      <CourseDetailsForm course={course} />
      <CourseStatusPanel course={course} />
      <LessonsSection course={course} />
    </div>
  );
}
