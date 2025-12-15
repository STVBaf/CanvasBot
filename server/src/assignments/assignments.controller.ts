import { Controller, Get, Param, Query } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { GetToken } from '../auth/get-token.decorator';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * 获取课程的所有作业
   * GET /api/assignments/course/:courseId
   */
  @Get('course/:courseId')
  async getCourseAssignments(
    @Param('courseId') courseId: string,
    @GetToken() token: string
  ) {
    const assignments = await this.assignmentsService.getCourseAssignments(token, courseId);

    return {
      courseId,
      assignments,
      total: assignments.length,
    };
  }

  /**
   * 获取作业详情
   * GET /api/assignments/course/:courseId/assignment/:assignmentId
   */
  @Get('course/:courseId/assignment/:assignmentId')
  async getAssignment(
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
    @GetToken() token: string
  ) {
    const assignment = await this.assignmentsService.getAssignment(token, courseId, assignmentId);

    return assignment;
  }

  /**
   * 获取即将到期的作业
   * GET /api/assignments/upcoming?days=7
   */
  @Get('upcoming')
  async getUpcomingAssignments(
    @Query('days') days: string = '7',
    @GetToken() token: string
  ) {
    const daysAhead = parseInt(days, 10) || 7;
    const assignments = await this.assignmentsService.getUpcomingAssignments(token, daysAhead);

    return assignments;
  }

  /**
   * 获取紧急作业（7天内到期）
   * GET /api/assignments/urgent
   */
  @Get('urgent')
  async getUrgentAssignments(@GetToken() token: string) {
    const assignments = await this.assignmentsService.getUrgentAssignments(token);

    return assignments;
  }
}
