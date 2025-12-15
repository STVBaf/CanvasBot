import { Injectable } from '@nestjs/common';
import { CanvasService } from '../canvas/canvas.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly canvas: CanvasService) {}

  /**
   * 获取课程的所有作业
   */
  async getCourseAssignments(accessToken: string, courseId: string) {
    const assignments = await this.canvas.getCourseAssignments(accessToken, courseId);
    
    // 格式化返回数据
    return assignments.map((assignment: any) => this.formatAssignment(assignment));
  }

  /**
   * 获取单个作业详情
   */
  async getAssignment(accessToken: string, courseId: string, assignmentId: string) {
    const assignment = await this.canvas.getAssignmentDetail(accessToken, courseId, assignmentId);
    return this.formatAssignment(assignment);
  }

  /**
   * 获取即将到期的作业（所有课程）
   */
  async getUpcomingAssignments(accessToken: string, daysAhead: number = 30) {
    const assignments = await this.canvas.getUpcomingAssignments(accessToken);
    
    // 筛选指定天数内的作业
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    const filtered = assignments.filter((assignment: any) => {
      if (!assignment.due_at) return false;
      const dueDate = new Date(assignment.due_at);
      return dueDate >= now && dueDate <= futureDate;
    });

    return filtered.map((assignment: any) => this.formatAssignment(assignment));
  }

  /**
   * 获取紧急作业（7天内到期）
   */
  async getUrgentAssignments(accessToken: string) {
    const assignments = await this.canvas.getUpcomingAssignments(accessToken);
    
    const now = new Date();
    const urgentDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const urgent = assignments.filter((assignment: any) => {
      if (!assignment.due_at) return false;
      const dueDate = new Date(assignment.due_at);
      return dueDate >= now && dueDate <= urgentDate;
    });

    return urgent.map((assignment: any) => ({
      ...this.formatAssignment(assignment),
      isUrgent: true,
      urgencyLevel: this.getUrgencyLevel(assignment.due_at),
    }));
  }

  /**
   * 获取紧急程度级别
   */
  private getUrgencyLevel(dueDate: string): string {
    const hours = this.calculateHoursUntilDue(dueDate);
    if (hours < 0) return 'overdue';
    if (hours <= 24) return 'critical'; // 1天内
    if (hours <= 72) return 'high';     // 3天内
    return 'normal';
  }

  /**
   * 格式化作业数据
   */
  private formatAssignment(assignment: any) {
    const now = new Date();
    const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
    const isOverdue = dueDate ? dueDate < now : false;
    const daysUntilDue = dueDate ? this.calculateDaysUntilDue(assignment.due_at) : null;
    const hoursUntilDue = dueDate ? this.calculateHoursUntilDue(assignment.due_at) : null;

    // 解码 HTML 描述中的 Unicode 转义序列
    let description = assignment.description;
    if (description && typeof description === 'string') {
      description = this.decodeUnicodeString(description);
    }

    // 检查当前用户是否已提交
    // Canvas API 在 include=['submission'] 时会返回 submission 对象
    const submission = assignment.submission;
    const hasSubmitted = submission?.workflow_state && 
                        submission.workflow_state !== 'unsubmitted';

    // 处理课程信息（upcoming_events API 可能不包含完整的 course 对象）
    const courseName = assignment.course?.name || assignment.context_name || null;
    const courseCode = assignment.course?.course_code || null;

    return {
      id: assignment.id,
      courseId: assignment.course_id,
      courseName,
      courseCode,
      name: assignment.name,
      description: description,
      dueAt: assignment.due_at,
      unlockAt: assignment.unlock_at,
      lockAt: assignment.lock_at,
      pointsPossible: assignment.points_possible,
      submissionTypes: assignment.submission_types || [],
      allowedExtensions: assignment.allowed_extensions || [],
      hasSubmitted: hasSubmitted,
      submissionStatus: submission?.workflow_state || 'unsubmitted',
      submittedAt: submission?.submitted_at || null,
      grade: submission?.grade || null,
      score: submission?.score || null,
      published: assignment.published || false,
      htmlUrl: assignment.html_url,
      isOverdue,
      daysUntilDue,
      hoursUntilDue,
      isUrgent: daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7,
      gradingType: assignment.grading_type,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
    };
  }

  /**
   * 计算距离截止日期的天数
   */
  private calculateDaysUntilDue(dueAt: string): number {
    const now = new Date();
    const dueDate = new Date(dueAt);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  /**
   * 计算距离截止日期的小时数
   */
  private calculateHoursUntilDue(dueDate: string): number {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    return diffHours;
  }

  /**
   * 解码 Unicode 转义字符串（如 \u003c 转为 <）
   */
  private decodeUnicodeString(str: string): string {
    return str.replace(/\\u([\dA-Fa-f]{4})/g, (match, grp) => {
      return String.fromCharCode(parseInt(grp, 16));
    });
  }
}
