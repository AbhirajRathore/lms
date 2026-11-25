import { useId, useState, type SubmitEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CourseDetail, UpdateCourseInput } from '@lms/shared';
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

/** Title and description of a course. */
export function CourseDetailsForm({ course }: { course: CourseDetail }) {
  const headingId = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CourseFormValues>(() => courseFormValues(course));
  const [errors, setErrors] = useState<FieldErrors<CourseField>>({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (input: UpdateCourseInput) => api.manage.update(course.id, input),
    onSuccess: (updated) => {
      void cacheCourse(queryClient, updated);
      setValues(courseFormValues(updated));
      setSaved(true);
    },
  });

  function change(field: CourseField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const result = validateCourse(values);
    if (!result.ok) {
      showErrors(event.currentTarget, () => setErrors(result.errors));
      return;
    }
    setErrors({});
    save.mutate(result.value);
  }

  return (
    <form className="card" aria-labelledby={headingId} noValidate onSubmit={handleSubmit}>
      {/* Disabled while saving: the response replaces the form values, which would drop newer edits. */}
      <fieldset className="stack manage-fieldset" disabled={save.isPending}>
        <h2 id={headingId}>Details</h2>
        <Field label="Title" error={errors.title}>
          {(control) => (
            <input
              {...control}
              type="text"
              required
              value={values.title}
              onChange={(event) => change('title', event.target.value)}
            />
          )}
        </Field>
        <Field label="Description" optional error={errors.description}>
          {(control) => (
            <textarea
              {...control}
              rows={4}
              value={values.description}
              onChange={(event) => change('description', event.target.value)}
            />
          )}
        </Field>
        {save.error && (
          <p role="alert" className="alert">
            {save.error.message}
          </p>
        )}
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save details'}
          </button>
          <p role="status" className="manage-status">
            {saved ? 'Details saved.' : ''}
          </p>
        </div>
      </fieldset>
    </form>
  );
}
