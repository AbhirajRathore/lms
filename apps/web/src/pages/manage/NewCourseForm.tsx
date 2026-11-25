import { useId, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCourseInput } from '@lms/shared';
import { api } from '../../api/client';
import { Field } from './Field';
import {
  courseFormValues,
  showErrors,
  validateCourse,
  type CourseField,
  type CourseFormValues,
  type FieldErrors,
} from './forms';
import { cacheCourse } from './queries';

/** Inline "New course" form: creates a draft and opens its edit page. */
export function NewCourseForm({ onCancel }: { onCancel: () => void }) {
  const headingId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CourseFormValues>(() => courseFormValues());
  const [errors, setErrors] = useState<FieldErrors<CourseField>>({});

  const create = useMutation({
    mutationFn: (input: CreateCourseInput) => api.manage.create(input),
    onSuccess: (course) => {
      void cacheCourse(queryClient, course);
      void navigate(`/manage/courses/${course.id}`);
    },
  });

  function change(field: CourseField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateCourse(values);
    if (!result.ok) {
      showErrors(event.currentTarget, () => setErrors(result.errors));
      return;
    }
    setErrors({});
    create.mutate(result.value);
  }

  return (
    <form className="card stack" aria-labelledby={headingId} noValidate onSubmit={handleSubmit}>
      <h2 id={headingId}>New course</h2>
      <Field label="Title" error={errors.title}>
        {(control) => (
          <input
            {...control}
            type="text"
            required
            autoFocus
            value={values.title}
            onChange={(event) => change('title', event.target.value)}
          />
        )}
      </Field>
      <Field label="Description" optional error={errors.description}>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={values.description}
            onChange={(event) => change('description', event.target.value)}
          />
        )}
      </Field>
      {create.error && (
        <p role="alert" className="alert">
          {create.error.message}
        </p>
      )}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create course'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={create.isPending}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
