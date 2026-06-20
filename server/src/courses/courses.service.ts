import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanvasService } from '../canvas/canvas.service';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canvas: CanvasService,
  ) {}

  async getCoursesForUser(userId: string) {
    const accessToken = await this.canvas.getAccessTokenForUser(userId);
    const courses = await this.canvas.getCourses(accessToken);
    return courses;
  }

  async getCoursesByToken(accessToken: string) {
    return this.canvas.getCourses(accessToken);
  }
}
