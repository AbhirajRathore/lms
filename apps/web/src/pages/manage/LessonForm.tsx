import { useState, type SubmitEvent } from 'react';
import {
  LESSON_TYPES,
  LIMITS,
  isLessonType,
  type Lesson,
  type LessonInput,
  type LessonType,
} from '@lms/shared';
import { Field } from './Field';
import { LESSON_TYPE_LABELS } from './format';
import {
  lessonFormValues,
  showErrors,
  validateLesson,
  type FieldErrors,
  type LessonField,
  type LessonFormValues,
} from './forms';

interface LessonFormProps {
  /** Accessible name of the form, e.g. "Add a lesson". */
  label: string;
  submitLabel: string;
  /** Prefills the form when editing. */
  initial?: Lesson;
  pending: boolean;
  /** Message from the API when the last submit failed. */
  serverError?: string;
  autoFocus?: boolean;
  onSubmit: (input: LessonInput) => void;
  onCancel?: () => void;
}

/** Add or edit a lesson. The fields shown depend on the lesson type. */
export function LessonForm({
  label,
  submitLabel,
  initial,
  pending,
  serverError,
  autoFocus = false,
  onSubmit,
  onCancel,
}: LessonFormProps) {
  const [values, setValues] = useState<LessonFormValues>(() => lessonFormValues(initial));
  const [errors, setErrors] = useState<FieldErrors<LessonField>>({});
  const isText = values.type === 'text';

  function change<K extends LessonField>(field: K, value: LessonFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changeType(type: LessonType) {
    setValues((current) => ({ ...current, type }));
    // Body and URL rules depend on the type; an old error would show on the wrong field.
    setErrors((current) => ({ ...current, type: undefined, body: undefined, url: undefined }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateLesson(values);
    if (!result.ok) {
      showErrors(event.currentTarget, () => setErrors(result.errors));
      return;
    }
    setErrors({});
    onSubmit(result.value);
  }

  return (
    <form className="manage-lesson-form" aria-label={label} noValidate onSubmit={handleSubmit}>
      {/* Disabled while saving so nothing typed after Save is silently dropped. */}
      <fieldset className="stack manage-fieldset" disabled={pending}>
        <Field label="Title" error={errors.title}>
          {(control) => (
            <input
              {...control}
              type="text"
              required
              autoFocus={autoFocus}
              value={values.title}
              onChange={(event) => change('title', event.target.value)}
            />
          )}
        </Field>

        <div className="manage-lesson-form-grid">
          <Field label="Type" error={errors.type}>
            {(control) => (
              <select
                {...control}
                value={values.type}
                onChange={(event) => {
                  if (isLessonType(event.target.value)) changeType(event.target.value);
                }}
              >
                {LESSON_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LESSON_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label="Duration in minutes"
            optional
            hint={`Whole minutes, 1 to ${LIMITS.lessonDurationMinutes}.`}
            error={errors.durationMinutes}
          >
            {(control) => (
              // Text, not type="number": a number input reports bad input such as "ten" as an
              // empty value, which would be saved as "no duration" without an error.
              <input
                {...control}
                type="text"
                inputMode="numeric"
                value={values.durationMinutes}
                onChange={(event) => change('durationMinutes', event.target.value)}
              />
            )}
          </Field>
        </div>

        {isText ? (
          <Field label="Lesson text" hint="Plain text. Line breaks are kept." error={errors.body}>
            {(control) => (
              <textarea
                {...control}
                required
                rows={8}
                value={values.body}
                onChange={(event) => change('body', event.target.value)}
              />
            )}
          </Field>
        ) : (
          <>
            <Field
              label={values.type === 'video' ? 'Video URL' : 'Document URL'}
              hint="A full link that starts with https://"
              error={errors.url}
            >
              {(control) => (
                <input
                  {...control}
                  type="url"
                  inputMode="url"
                  required
                  placeholder="https://"
                  value={values.url}
                  onChange={(event) => change('url', event.target.value)}
                />
              )}
            </Field>
            <Field label="Notes" optional hint="Shown under the media." error={errors.body}>
              {(control) => (
                <textarea
                  {...control}
                  rows={4}
                  value={values.body}
                  onChange={(event) => change('body', event.target.value)}
                />
              )}
            </Field>
          </>
        )}

        {serverError && (
          <p role="alert" className="alert">
            {serverError}
          </p>
        )}

        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
