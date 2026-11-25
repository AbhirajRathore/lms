import type { LessonType } from '@lms/shared';

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  text: 'Text',
  video: 'Video',
  document: 'Document',
};

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** A readable local date and time, e.g. "25 Nov 2026, 14:05". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date);
}

export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}
