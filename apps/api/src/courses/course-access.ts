import { NotFoundException } from '@nestjs/common';
import type { CurrentUser } from '@lms/shared';
import type { Prisma } from '../generated/prisma/client.js';

export type Tx = Prisma.TransactionClient;

/** Admins may edit every course; instructors only the ones they created. */
export function canEdit(user: CurrentUser, createdById: string): boolean {
  return (
    user.roles.includes('admin') || (user.roles.includes('instructor') && createdById === user.id)
  );
}

/** Same 404 for "does not exist" and "not yours", so ids of other people's drafts don't leak. */
export const courseNotFound = () => new NotFoundException('Course not found');

export interface LockedCourse {
  id: string;
  createdById: string;
  published: boolean;
}

/**
 * Locks the course row until the transaction ends, so changes to one course (and its lesson
 * positions) run one at a time. Throws 404 unless the user may edit the course.
 */
export async function lockEditableCourse(
  tx: Tx,
  user: CurrentUser,
  courseId: string,
): Promise<LockedCourse> {
  const [course] = await tx.$queryRaw<LockedCourse[]>`
    SELECT "id", "createdById", "published" FROM "Course" WHERE "id" = ${courseId}::uuid FOR UPDATE`;
  if (!course || !canEdit(user, course.createdById)) throw courseNotFound();
  return course;
}

/** Any successful change to a course or its lessons bumps Course.updatedAt. */
export async function touchCourse(tx: Tx, courseId: string): Promise<void> {
  await tx.course.update({ where: { id: courseId }, data: { updatedAt: new Date() } });
}
