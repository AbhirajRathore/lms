import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LIMITS,
  type CourseDetail,
  type Lesson,
  type LessonInput,
  type UpdateLessonInput,
} from '@lms/shared';
import { api } from '../../api/client';
import { LESSON_TYPE_LABELS, formatDuration } from './format';
import { LessonForm } from './LessonForm';
import { manageKeys, refreshManaged } from './queries';

type Direction = 'up' | 'down';

/** A copy of `items` with the item at `from` moved to `to`. */
function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

/** Ordered lesson list (reorder, inline edit, delete) and the "Add a lesson" form. */
export function LessonsSection({ course }: { course: CourseDetail }) {
  const headingId = useId();
  const addHeadingId = useId();
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLOListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** The move button to focus again once a reorder settles, e.g. `{ id, direction: 'down' }`. */
  const refocusMove = useRef<{ id: string; direction: Direction } | null>(null);
  /** The lesson whose Edit button gets focus back once its editor has closed. */
  const refocusEdit = useRef<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [addFormKey, setAddFormKey] = useState(0);
  const { lessons } = course;
  const full = lessons.length >= LIMITS.lessonsPerCourse;

  const add = useMutation({
    mutationFn: (input: LessonInput) => api.manage.addLesson(course.id, input),
    onSuccess: async (lesson) => {
      await refreshManaged(queryClient);
      setAddFormKey((key) => key + 1);
      setStatus(`Added “${lesson.title}”.`);
    },
  });

  const update = useMutation({
    mutationFn: ({ lessonId, input }: { lessonId: string; input: UpdateLessonInput }) =>
      api.manage.updateLesson(course.id, lessonId, input),
    onSuccess: async (lesson) => {
      await refreshManaged(queryClient);
      closeEditor(lesson.id);
      setStatus(`Saved “${lesson.title}”.`);
    },
  });

  const remove = useMutation({
    mutationFn: (lesson: Lesson) => api.manage.removeLesson(course.id, lesson.id),
    onSuccess: async (_, lesson) => {
      await refreshManaged(queryClient);
      setStatus(`Deleted “${lesson.title}”.`);
      headingRef.current?.focus();
    },
    // e.g. 404 when someone else already deleted it: show the lessons as they are now.
    onError: () => refreshManaged(queryClient),
  });

  const reorder = useMutation({
    mutationFn: (lessonIds: string[]) => api.manage.reorderLessons(course.id, lessonIds),
    onSuccess: async (ordered) => {
      queryClient.setQueryData<CourseDetail>(manageKeys.course(course.id), (current) =>
        current ? { ...current, lessons: ordered } : current,
      );
      await refreshManaged(queryClient);
    },
    // A 400 means the lesson list changed elsewhere; retrying the same stale order would fail
    // again, so reload the real order.
    onError: () => refreshManaged(queryClient),
  });

  const busy = add.isPending || update.isPending || remove.isPending || reorder.isPending;
  const listError = reorder.error ?? remove.error;

  // Move buttons are disabled while a reorder saves, which drops keyboard focus.
  // Once it settles, put focus back on the moved lesson's button.
  useEffect(() => {
    const target = refocusMove.current;
    if (!target || reorder.isPending) return;
    refocusMove.current = null;
    const row = listRef.current?.querySelector(`[data-lesson-id="${target.id}"]`);
    const button =
      row?.querySelector<HTMLButtonElement>(`[data-move="${target.direction}"]:enabled`) ??
      row?.querySelector<HTMLButtonElement>('[data-move]:enabled');
    button?.focus();
  }, [lessons, reorder.isPending]);

  // After an edit closes, return focus to that row's Edit button. On save the button is still
  // disabled while the mutation settles, so wait until nothing is pending.
  useEffect(() => {
    const id = refocusEdit.current;
    if (!id || busy || editingId !== null) return;
    const button = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-lesson-id="${id}"] [data-action="edit"]`,
    );
    if (button && !button.disabled) {
      refocusEdit.current = null;
      button.focus();
    }
  }, [busy, editingId, lessons]);

  function resetListErrors() {
    reorder.reset();
    remove.reset();
  }

  function move(index: number, direction: Direction) {
    const lesson = lessons[index];
    if (!lesson) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    const lessonIds = moveItem(
      lessons.map((item) => item.id),
      index,
      target,
    );
    resetListErrors();
    setStatus('');
    refocusMove.current = { id: lesson.id, direction };
    reorder.mutate(lessonIds, {
      onSuccess: () => setStatus(`Moved “${lesson.title}” to position ${target + 1}.`),
    });
  }

  function deleteLesson(lesson: Lesson) {
    if (!window.confirm(`Delete the lesson “${lesson.title}”? This cannot be undone.`)) return;
    resetListErrors();
    setStatus('');
    remove.mutate(lesson);
  }

  function openEditor(lessonId: string) {
    update.reset();
    setStatus('');
    setEditingId(lessonId);
  }

  function closeEditor(lessonId: string) {
    refocusEdit.current = lessonId;
    setEditingId(null);
  }

  return (
    <>
      <section className="card stack" aria-labelledby={headingId}>
        <div className="row">
          <h2 id={headingId} ref={headingRef} tabIndex={-1}>
            Lessons
          </h2>
          <span className="muted">
            {lessons.length} of {LIMITS.lessonsPerCourse}
          </span>
        </div>

        {lessons.length === 0 ? (
          <div className="empty">No lessons yet. Add the first one below.</div>
        ) : (
          <ol className="manage-lesson-list" ref={listRef} aria-labelledby={headingId}>
            {lessons.map((lesson, index) =>
              editingId === lesson.id ? (
                <li key={lesson.id} className="manage-lesson-item manage-lesson-item-editing">
                  <LessonForm
                    label={`Edit lesson ${index + 1}: ${lesson.title}`}
                    submitLabel="Save lesson"
                    initial={lesson}
                    autoFocus
                    pending={update.isPending}
                    serverError={update.error?.message}
                    onSubmit={(input) => update.mutate({ lessonId: lesson.id, input })}
                    onCancel={() => closeEditor(lesson.id)}
                  />
                </li>
              ) : (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  position={index + 1}
                  isFirst={index === 0}
                  isLast={index === lessons.length - 1}
                  busy={busy}
                  // One editor at a time: switching would silently drop unsaved edits.
                  editLocked={editingId !== null}
                  onMove={(direction) => move(index, direction)}
                  onEdit={() => openEditor(lesson.id)}
                  onDelete={() => deleteLesson(lesson)}
                />
              ),
            )}
          </ol>
        )}

        <p role="status" className="manage-status">
          {status}
        </p>
        {listError && (
          <p role="alert" className="alert">
            {listError.message}
          </p>
        )}
      </section>

      <section className="card stack" aria-labelledby={addHeadingId}>
        <h2 id={addHeadingId}>Add a lesson</h2>
        {full ? (
          <p className="muted">This course has the maximum of {LIMITS.lessonsPerCourse} lessons.</p>
        ) : (
          <LessonForm
            key={addFormKey}
            label="Add a lesson"
            submitLabel="Add lesson"
            autoFocus={addFormKey > 0}
            pending={add.isPending}
            serverError={add.error?.message}
            onSubmit={(input) => add.mutate(input)}
          />
        )}
      </section>
    </>
  );
}

interface LessonRowProps {
  lesson: Lesson;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  editLocked: boolean;
  onMove: (direction: Direction) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function LessonRow({
  lesson,
  position,
  isFirst,
  isLast,
  busy,
  editLocked,
  onMove,
  onEdit,
  onDelete,
}: LessonRowProps) {
  // Visually hidden suffix so each button names its lesson, e.g. "Move up: Welcome".
  const which = <span className="visually-hidden">{`: ${lesson.title}`}</span>;

  return (
    <li className="manage-lesson-item" data-lesson-id={lesson.id}>
      <span className="manage-lesson-position">{position}</span>
      <div className="manage-lesson-main">
        <span className="manage-lesson-title">{lesson.title}</span>
        <span className="manage-lesson-meta">
          <span className="badge">{LESSON_TYPE_LABELS[lesson.type]}</span>
          {lesson.durationMinutes !== null && (
            <span className="muted">{formatDuration(lesson.durationMinutes)}</span>
          )}
        </span>
      </div>
      <div className="row manage-lesson-actions">
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          data-move="up"
          disabled={busy || isFirst}
          onClick={() => onMove('up')}
        >
          Move up{which}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          data-move="down"
          disabled={busy || isLast}
          onClick={() => onMove('down')}
        >
          Move down{which}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          data-action="edit"
          disabled={busy || editLocked}
          title={editLocked ? 'Save or cancel the lesson you are editing first' : undefined}
          onClick={onEdit}
        >
          Edit{which}
        </button>
        <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={onDelete}>
          Delete{which}
        </button>
      </div>
    </li>
  );
}
