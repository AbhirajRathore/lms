import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { CourseDetail, CourseSummary, CurrentUser, ManagedCourseSummary } from '@lms/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { canEdit, courseNotFound, lockEditableCourse, type Tx } from './course-access.js';
import {
  detailInclude,
  managedInclude,
  summaryInclude,
  toCourseDetail,
  toCourseSummary,
  toManagedCourseSummary,
} from './course.mapper.js';
import type { CreateCourseData, UpdateCourseData } from './course.schemas.js';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The learner catalogue: published courses, newest first. */
  async listPublished(): Promise<CourseSummary[]> {
    const courses = await this.prisma.course.findMany({
      where: { published: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      include: summaryInclude,
    });
    return courses.map(toCourseSummary);
  }

  /** A published course, or a draft the user may edit; 404 otherwise. */
  async getVisible(user: CurrentUser, id: string): Promise<CourseDetail> {
    const course = await this.prisma.course.findUnique({ where: { id }, include: detailInclude });
    if (!course || !(course.published || canEdit(user, course.createdById))) {
      throw courseNotFound();
    }
    return toCourseDetail(course, user);
  }

  /** Admins see every course, instructors their own; most recently updated first. */
  async listManaged(user: CurrentUser): Promise<ManagedCourseSummary[]> {
    const courses = await this.prisma.course.findMany({
      where: user.roles.includes('admin') ? {} : { createdById: user.id },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      include: managedInclude,
    });
    return courses.map(toManagedCourseSummary);
  }

  async getEditable(user: CurrentUser, id: string): Promise<CourseDetail> {
    const course = await this.prisma.course.findUnique({ where: { id }, include: detailInclude });
    if (!course || !canEdit(user, course.createdById)) throw courseNotFound();
    return toCourseDetail(course, user);
  }

  async create(user: CurrentUser, input: CreateCourseData): Promise<CourseDetail> {
    const course = await this.prisma.course.create({
      data: { title: input.title, description: input.description ?? null, createdById: user.id },
      include: detailInclude,
    });
    return toCourseDetail(course, user);
  }

  async update(user: CurrentUser, id: string, input: UpdateCourseData): Promise<CourseDetail> {
    return this.prisma.$transaction(async (tx) => {
      await lockEditableCourse(tx, user, id);
      const course = await tx.course.update({
        where: { id },
        data: { title: input.title, description: input.description },
        include: detailInclude,
      });
      return toCourseDetail(course, user);
    });
  }

  /** Idempotent: publishing a published course changes nothing. */
  async publish(user: CurrentUser, id: string): Promise<CourseDetail> {
    return this.prisma.$transaction(async (tx) => {
      const course = await lockEditableCourse(tx, user, id);
      if (!course.published) {
        const lessons = await tx.lesson.count({ where: { courseId: id } });
        if (lessons === 0) {
          throw new BadRequestException('Add at least one lesson before publishing the course');
        }
        await tx.course.update({
          where: { id },
          data: { published: true, publishedAt: new Date() },
        });
      }
      return this.loadDetail(tx, user, id);
    });
  }

  /** Idempotent: unpublishing a draft changes nothing. */
  async unpublish(user: CurrentUser, id: string): Promise<CourseDetail> {
    return this.prisma.$transaction(async (tx) => {
      const course = await lockEditableCourse(tx, user, id);
      if (course.published) {
        await tx.course.update({ where: { id }, data: { published: false, publishedAt: null } });
      }
      return this.loadDetail(tx, user, id);
    });
  }

  /** Only drafts can be deleted; their lessons go with them. */
  async remove(user: CurrentUser, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const course = await lockEditableCourse(tx, user, id);
      if (course.published) {
        throw new ConflictException('Unpublish the course before deleting it');
      }
      await tx.course.delete({ where: { id } });
    });
  }

  private async loadDetail(tx: Tx, user: CurrentUser, id: string): Promise<CourseDetail> {
    const course = await tx.course.findUniqueOrThrow({ where: { id }, include: detailInclude });
    return toCourseDetail(course, user);
  }
}
