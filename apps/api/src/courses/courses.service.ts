import { Injectable } from '@nestjs/common';
import type { CourseSummary } from '@lms/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<CourseSummary[]> {
    const courses = await this.prisma.course.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, published: true, createdAt: true },
    });
    return courses.map((course) => ({ ...course, createdAt: course.createdAt.toISOString() }));
  }
}
