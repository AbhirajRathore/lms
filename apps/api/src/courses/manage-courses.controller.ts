import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import type {
  CourseDetail,
  CurrentUser as CurrentUserType,
  Lesson,
  ManagedCourseSummary,
} from '@lms/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CoursesService } from './courses.service.js';
import { LessonsService } from './lessons.service.js';
import {
  createCourseSchema,
  createLessonSchema,
  reorderLessonsSchema,
  updateCourseSchema,
  updateLessonSchema,
  type CreateCourseData,
  type LessonData,
  type ReorderLessonsData,
  type UpdateCourseData,
  type UpdateLessonData,
} from './course.schemas.js';

const courseId = new ParseIdPipe('Course not found');
const lessonId = new ParseIdPipe('Lesson not found');

/** Authoring. Learners get 403 here; courses the caller may not edit are 404. */
@Roles('admin', 'instructor')
@Controller('manage/courses')
export class ManageCoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly lessons: LessonsService,
  ) {}

  @Get()
  list(@CurrentUser() user: CurrentUserType): Promise<ManagedCourseSummary[]> {
    return this.courses.listManaged(user);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createCourseSchema)) input: CreateCourseData,
  ): Promise<CourseDetail> {
    return this.courses.create(user, input);
  }

  @Get(':id')
  get(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
  ): Promise<CourseDetail> {
    return this.courses.getEditable(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) input: UpdateCourseData,
  ): Promise<CourseDetail> {
    return this.courses.update(user, id, input);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
  ): Promise<CourseDetail> {
    return this.courses.publish(user, id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  unpublish(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
  ): Promise<CourseDetail> {
    return this.courses.unpublish(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: CurrentUserType, @Param('id', courseId) id: string): Promise<void> {
    return this.courses.remove(user, id);
  }

  @Post(':id/lessons')
  addLesson(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
    @Body(new ZodValidationPipe(createLessonSchema)) input: LessonData,
  ): Promise<Lesson> {
    return this.lessons.add(user, id, input);
  }

  @Put(':id/lessons/order')
  reorderLessons(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
    @Body(new ZodValidationPipe(reorderLessonsSchema)) input: ReorderLessonsData,
  ): Promise<Lesson[]> {
    return this.lessons.reorder(user, id, input.lessonIds);
  }

  @Patch(':id/lessons/:lessonId')
  updateLesson(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
    @Param('lessonId', lessonId) lesson: string,
    @Body(new ZodValidationPipe(updateLessonSchema)) input: UpdateLessonData,
  ): Promise<Lesson> {
    return this.lessons.update(user, id, lesson, input);
  }

  @Delete(':id/lessons/:lessonId')
  @HttpCode(204)
  removeLesson(
    @CurrentUser() user: CurrentUserType,
    @Param('id', courseId) id: string,
    @Param('lessonId', lessonId) lesson: string,
  ): Promise<void> {
    return this.lessons.remove(user, id, lesson);
  }
}
