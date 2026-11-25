import { Link, useParams } from 'react-router';
import { DraftNotice, NotFound } from './Notices';
import {
  formatDuration,
  isNotFound,
  lessonCountLabel,
  lessonTypeLabel,
  useCourse,
} from './courseQueries';
import './learn.css';

export function CoursePage() {
  const { courseId = '' } = useParams();
  const course = useCourse(courseId);

  if (course.isPending) return <p className="muted">Loading course…</p>;
  // A failed background refetch keeps the course on screen; only a 404 or a first load fails.
  if (course.isError && (isNotFound(course.error) || !course.data)) {
    if (isNotFound(course.error)) {
      return (
        <NotFound title="Course not found" backTo="/courses" backLabel="Browse all courses">
          <p>It may have been unpublished or removed.</p>
        </NotFound>
      );
    }
    return (
      <p className="alert" role="alert">
        Couldn’t load this course: {course.error.message}
      </p>
    );
  }
  if (!course.data) return null;

  const { id, title, description, published, canEdit, lessons } = course.data;
  const firstLesson = lessons[0];

  return (
    <article className="stack learn-page">
      <nav aria-label="Breadcrumb" className="learn-breadcrumb">
        <Link to="/courses">Courses</Link>
      </nav>

      <header className="page-header">
        <div className="learn-title">
          <h1>
            {title} {!published && <span className="badge badge-draft">Draft</span>}
          </h1>
          <p className="muted">{lessonCountLabel(lessons.length)}</p>
        </div>
        <div className="row">
          {canEdit && (
            <Link className="btn" to={`/manage/courses/${id}`}>
              Edit course
            </Link>
          )}
          {firstLesson && (
            <Link className="btn btn-primary" to={`/courses/${id}/lessons/${firstLesson.id}`}>
              Start course
            </Link>
          )}
        </div>
      </header>

      {!published && <DraftNotice />}
      {description && <p className="learn-description">{description}</p>}

      <section aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lessons</h2>
        {lessons.length === 0 ? (
          <p className="empty">This course has no lessons yet.</p>
        ) : (
          <ol className="lesson-list">
            {lessons.map((lesson, index) => {
              const duration = formatDuration(lesson.durationMinutes);
              return (
                <li key={lesson.id}>
                  <Link to={`/courses/${id}/lessons/${lesson.id}`} className="lesson-row">
                    <span className="lesson-number" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="lesson-row-title">{lesson.title}</span>
                    <span className="lesson-row-meta">
                      {lessonTypeLabel(lesson.type)}
                      {duration && ` · ${duration}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </article>
  );
}
