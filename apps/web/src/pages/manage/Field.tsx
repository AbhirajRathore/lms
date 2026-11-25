import { useId, type ReactNode } from 'react';

/** Props to spread onto the input, select or textarea rendered inside a `Field`. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface FieldProps {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** A labelled form control with an optional hint and error, both tied to the control. */
export function Field({ label, optional = false, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="field-optional"> (optional)</span>}
      </label>
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
