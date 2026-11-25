import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function CoursesPage() {
  const courses = useQuery({ queryKey: ['courses'], queryFn: api.courses });

  if (courses.isPending) return <p>Loading courses…</p>;
  if (courses.isError) return <p role="alert">Could not load courses.</p>;
  if (courses.data.length === 0) return <p>No published courses yet.</p>;

  return (
    <section>
      <h1>Courses</h1>
      <ul>
        {courses.data.map((course) => (
          <li key={course.id}>
            <strong>{course.title}</strong>
            {course.description ? ` — ${course.description}` : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
