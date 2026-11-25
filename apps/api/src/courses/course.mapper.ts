import type {
  CourseDetail,
  CourseSummary,
  CurrentUser,
  Lesson,
  ManagedCourseSummary,
} from '@lms/shared';
import type { Course, Lesson as LessonRow, Prisma } from '../generated/prisma/client.js';
import { canEdit } from './course-access.js';

export const summaryInclude = {
  _count: { select: { lessons: true } },
} satisfies Prisma.CourseInclude;

export const managedInclude = {
  ...summaryInclude,
  createdBy: { select: { id: true, email: true } },
} satisfies Prisma.CourseInclude;

export const detailInclude = {
  createdBy: { select: { id: true, email: true } },
  lessons: { orderBy: { position: 'asc' } },
} satisfies Prisma.CourseInclude;

type SummaryRow = Prisma.CourseGetPayload<{ include: typeof summaryInclude }>;
type ManagedRow = Prisma.CourseGetPayload<{ include: typeof managedInclude }>;
type DetailRow = Prisma.CourseGetPayload<{ include: typeof detailInclude }>;

function summaryFields(course: Course, lessonCount: number): CourseSummary {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    published: course.published,
    lessonCount,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

export function toCourseSummary(row: SummaryRow): CourseSummary {
  return summaryFields(row, row._count.lessons);
}

export function toManagedCourseSummary(row: ManagedRow): ManagedCourseSummary {
  return {
    ...summaryFields(row, row._count.lessons),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdBy: row.createdBy,
  };
}

export function toCourseDetail(row: DetailRow, user: CurrentUser): CourseDetail {
  return {
    ...summaryFields(row, row.lessons.length),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    lessons: row.lessons.map(toLesson),
    canEdit: canEdit(user, row.createdById),
  };
}

export function toLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    type: row.type,
    body: row.body,
    url: row.url,
    durationMinutes: row.durationMinutes,
    position: row.position,
  };
}
