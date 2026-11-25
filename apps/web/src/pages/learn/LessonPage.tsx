import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { LessonContent } from './LessonContent';
import { DraftNotice, NotFound } from './Notices';
import { formatDuration, isNotFound, lessonTypeLabel, useCourse } from './courseQueries';
import './learn.css';

export function LessonPage() {
  const { courseId = '', lessonId = '' } = useParams();
  const course = useCourse(courseId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstLesson = useRef(true);

  // Following "Next" from the bottom of a long lesson should start the new one at the top, and
  // keyboard and screen-reader users should land on the new lesson's title (the pager link they
  // pressed may no longer exist on the first or last lesson).
  useEffect(() => {
    window.scrollTo(0, 0);
    if (firstLesson.current) {
      firstLesson.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [lessonId]);

  if (course.isPending) return <p className="muted">Loading lesson…</p>;
  // A failed background refetch keeps the lesson on screen; only a 404 or a first load fails.
  if (course.isError && (isNotFound(course.error) || !course.data)) {
    if (isNotFound(course.error)) {
      return <NotFound title="Course not found" backTo="/courses" backLabel="Browse all courses" />;
    }
    return (
      <p className="alert" role="alert">
        Couldn’t load this lesson: {course.error.message}
      </p>
    );
  }
  if (!course.data) return null;

  const { lessons } = course.data;
  const courseUrl = `/courses/${course.data.id}`;
  // The API accepts ids in any letter case and returns them lower-case.
  const wanted = lessonId.toLowerCase();
  const index = lessons.findIndex((lesson) => lesson.id === wanted);
  const lesson = lessons[index];
  if (!lesson) {
    return (
      <NotFound title="Lesson not found" backTo={courseUrl} backLabel="Back to course">
        <p>This lesson isn’t part of “{course.data.title}” any more.</p>
      </NotFound>
    );
  }

  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const duration = formatDuration(lesson.durationMinutes);

  return (
    <article className="stack learn-page">
      <nav aria-label="Breadcrumb" className="learn-breadcrumb">
        <Link to="/courses">Courses</Link>
        <span aria-hidden="true"> / </span>
        <Link to={courseUrl}>{course.data.title}</Link>
      </nav>

      {!course.data.published && <DraftNotice />}

      <header>
        <p className="muted learn-kicker">
          Lesson {index + 1} of {lessons.length} · {lessonTypeLabel(lesson.type)}
          {duration && ` · ${duration}`}
        </p>
        <h1 ref={headingRef} tabIndex={-1}>
          {lesson.title}
        </h1>
      </header>

      <div className="card">
        {/* Keyed so each lesson gets a fresh player: changing an existing iframe's src would add
            an entry to the browser history and make Back replay the previous video. */}
        <LessonContent key={lesson.id} lesson={lesson} />
      </div>

      <nav aria-label="Lessons" className="lesson-pager">
        {previous ? (
          <Link className="btn" to={`${courseUrl}/lessons/${previous.id}`} rel="prev">
            <span aria-hidden="true">←</span> Previous
            <span className="visually-hidden">: {previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        <Link to={courseUrl}>Back to course</Link>
        {next ? (
          <Link className="btn btn-primary" to={`${courseUrl}/lessons/${next.id}`} rel="next">
            Next<span className="visually-hidden">: {next.title}</span>{' '}
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
