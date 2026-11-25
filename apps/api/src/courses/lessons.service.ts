import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LIMITS, type CurrentUser, type Lesson } from '@lms/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { validationError, type Problem } from '../common/zod-validation.pipe.js';
import { lockEditableCourse, touchCourse, type Tx } from './course-access.js';
import { toLesson } from './course.mapper.js';
import { lessonProblems, type LessonData, type UpdateLessonData } from './course.schemas.js';

const lessonNotFound = () => new NotFoundException('Lesson not found');

/** Why `requested` is not exactly the course's lesson ids, if it isn't. */
export function reorderProblems(
  lessonIds: readonly string[],
  requested: readonly string[],
): Problem[] {
  const existing = new Set(lessonIds);
  const wanted = new Set(requested);
  const problems: Problem[] = [];
  if (wanted.size !== requested.length) {
    problems.push({ path: ['lessonIds'], message: 'must not contain duplicates' });
  }
  const unknown = [...wanted].filter((id) => !existing.has(id)).length;
  if (unknown > 0) {
    problems.push({
      path: ['lessonIds'],
      message: `contains ${unknown} id(s) that are not lessons of this course`,
    });
  }
  const missing = [...existing].filter((id) => !wanted.has(id)).length;
  if (missing > 0) {
    problems.push({
      path: ['lessonIds'],
      message: `must list every lesson of the course (${missing} missing)`,
    });
  }
  return problems;
}

/**
 * Lesson changes. Each one runs in a transaction that first locks the course row, so appends,
 * deletes and reorders on the same course never interleave and positions stay 0..n-1.
 */
@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Appends the lesson at the end of the course. */
  async add(user: CurrentUser, courseId: string, input: LessonData): Promise<Lesson> {
    return this.prisma.$transaction(async (tx) => {
      await lockEditableCourse(tx, user, courseId);
      const position = await tx.lesson.count({ where: { courseId } });
      if (position >= LIMITS.lessonsPerCourse) {
        throw new BadRequestException(
          `A course can hold at most ${LIMITS.lessonsPerCourse} lessons`,
        );
      }
      const lesson = await tx.lesson.create({ data: { ...input, courseId, position } });
      await touchCourse(tx, courseId);
      return toLesson(lesson);
    });
  }

  /** Applies the patch; the merged lesson must pass the same rules as a new one. */
  async update(
    user: CurrentUser,
    courseId: string,
    lessonId: string,
    patch: UpdateLessonData,
  ): Promise<Lesson> {
    return this.prisma.$transaction(async (tx) => {
      await lockEditableCourse(tx, user, courseId);
      const existing = await this.findLesson(tx, courseId, lessonId);
      const merged: LessonData = {
        title: patch.title ?? existing.title,
        type: patch.type ?? existing.type,
        body: patch.body === undefined ? existing.body : patch.body,
        url: patch.url === undefined ? existing.url : patch.url,
        durationMinutes:
          patch.durationMinutes === undefined ? existing.durationMinutes : patch.durationMinutes,
      };
      const problems = lessonProblems(merged);
      if (problems.length > 0) throw validationError(problems);

      const lesson = await tx.lesson.update({ where: { id: lessonId }, data: merged });
      await touchCourse(tx, courseId);
      return toLesson(lesson);
    });
  }

  /** Deletes the lesson and closes the gap it leaves in the positions. */
  async remove(user: CurrentUser, courseId: string, lessonId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const course = await lockEditableCourse(tx, user, courseId);
      await this.findLesson(tx, courseId, lessonId);
      if (course.published && (await tx.lesson.count({ where: { courseId } })) === 1) {
        throw new ConflictException(
          'A published course needs at least one lesson; unpublish it before deleting its last lesson',
        );
      }
      await tx.lesson.delete({ where: { id: lessonId } });
      const remaining = await tx.lesson.findMany({
        where: { courseId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, position: true },
      });
      await this.applyOrder(
        tx,
        remaining,
        remaining.map((lesson) => lesson.id),
      );
      await touchCourse(tx, courseId);
    });
  }

  /** Puts the lessons in the given order; `lessonIds` must be exactly the course's lesson ids. */
  async reorder(user: CurrentUser, courseId: string, lessonIds: string[]): Promise<Lesson[]> {
    return this.prisma.$transaction(async (tx) => {
      await lockEditableCourse(tx, user, courseId);
      const current = await tx.lesson.findMany({
        where: { courseId },
        select: { id: true, position: true },
      });
      const problems = reorderProblems(
        current.map((lesson) => lesson.id),
        lessonIds,
      );
      if (problems.length > 0) throw validationError(problems);

      if (await this.applyOrder(tx, current, lessonIds)) await touchCourse(tx, courseId);
      const lessons = await tx.lesson.findMany({
        where: { courseId },
        orderBy: { position: 'asc' },
      });
      return lessons.map(toLesson);
    });
  }

  private async findLesson(tx: Tx, courseId: string, lessonId: string) {
    const lesson = await tx.lesson.findFirst({ where: { id: lessonId, courseId } });
    if (!lesson) throw lessonNotFound();
    return lesson;
  }

  /** Sets position = index in `order` for every lesson whose position differs. */
  private async applyOrder(
    tx: Tx,
    lessons: { id: string; position: number }[],
    order: string[],
  ): Promise<boolean> {
    const positions = new Map(lessons.map((lesson) => [lesson.id, lesson.position]));
    let changed = false;
    for (const [position, id] of order.entries()) {
      if (positions.get(id) === position) continue;
      await tx.lesson.update({ where: { id }, data: { position } });
      changed = true;
    }
    return changed;
  }
}
