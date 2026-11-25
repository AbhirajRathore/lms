import { Controller, Get } from '@nestjs/common';
import type { CourseSummary } from '@lms/shared';
import { CoursesService } from './courses.service.js';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(): Promise<CourseSummary[]> {
    return this.courses.listPublished();
  }
}
