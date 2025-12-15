import { Controller, Get, Logger } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { GetToken } from '../auth/get-token.decorator';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('courses')
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);

  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  // @UseGuards(JwtAuthGuard)
  async list(@GetToken() token: string) {
    try {
      const courses = await this.coursesService.getCoursesByToken(token);
      return courses;
    } catch (error) {
      this.logger.error(`Failed to get courses: ${error.message}`);
      throw error;
    }
  }
}
