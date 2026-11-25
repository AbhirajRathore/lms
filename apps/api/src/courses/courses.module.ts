import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller.js';
import { ManageCoursesController } from './manage-courses.controller.js';
import { CoursesService } from './courses.service.js';
import { LessonsService } from './lessons.service.js';

@Module({
  controllers: [CoursesController, ManageCoursesController],
  providers: [CoursesService, LessonsService],
})
export class CoursesModule {}
