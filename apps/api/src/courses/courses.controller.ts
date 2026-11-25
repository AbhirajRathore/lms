import { Controller, Get, Param } from '@nestjs/common';
import type { CourseDetail, CourseSummary, CurrentUser as CurrentUserType } from '@lms/shared';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { CoursesService } from './courses.service.js';

/** The catalogue, for every signed-in user. */
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(): Promise<CourseSummary[]> {
    return this.courses.listPublished();
  }

  @Get(':id')
  get(
    @CurrentUser() user: CurrentUserType,
    @Param('id', new ParseIdPipe('Course not found')) id: string,
  ): Promise<CourseDetail> {
    return this.courses.getVisible(user, id);
  }
}
