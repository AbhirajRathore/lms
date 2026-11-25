import { Link } from 'react-router';
import { lessonCountLabel, useCourses } from './courseQueries';
import './learn.css';

export function CataloguePage() {
  const courses = useCourses();

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Courses</h1>
          <p className="muted">Published courses you can open and read.</p>
        </div>
      </header>

      {courses.isPending ? (
        <p className="muted">Loading courses…</p>
      ) : courses.isError && !courses.data ? (
        <p className="alert" role="alert">
          Couldn’t load courses: {courses.error.message}
        </p>
      ) : !courses.data || courses.data.length === 0 ? (
        <p className="empty">No courses have been published yet.</p>
      ) : (
        <ul className="course-grid">
          {courses.data.map((course) => (
            <li key={course.id} className="card course-card">
              <h2>
                <Link to={`/courses/${course.id}`}>{course.title}</Link>
              </h2>
              {course.description && <p className="course-card-desc">{course.description}</p>}
              <p className="muted course-card-meta">{lessonCountLabel(course.lessonCount)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
