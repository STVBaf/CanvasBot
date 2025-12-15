// API 响应类型定义

export interface Course {
  id: number;
  name: string;
  course_code: string;
  start_at: string | null;
}

export interface SyncResponse {
  status: string;
  message: string;
  courseId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  canvasId?: string;
  createdAt?: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
  user: User;
}

export interface CourseFile {
  id: string;
  canvasFileId: string;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  downloadUrl: string;
  status: string;
  createdAt: string;
}

export interface FileSummary {
  fileId: string;
  summary: string;
  keyPoints: string[];
  actionItems?: string[];
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  courseId: string;
  courseName: string;
  memberCount: number;
  members: GroupMember[];
  creator: User;
  isCreator: boolean;
  isMember: boolean;
  isActive: boolean;
}

export interface CreateGroupParams {
  name: string;
  courseId: string;
  courseName: string;
  description?: string;
}

export interface Assignment {
  id: string;
  name: string;
  description?: string;
  dueAt: string | null;
  unlockAt?: string | null;
  lockAt?: string | null;
  pointsPossible?: number;
  submissionTypes?: string[];
  hasSubmitted: boolean;
  submissionStatus?: string;
  submittedAt?: string | null;
  grade?: string | null;
  score?: number | null;
  isOverdue?: boolean;
  isUrgent?: boolean;
  htmlUrl?: string;
  courseId: string;
  courseName?: string;
  daysUntilDue?: number;
  hoursUntilDue?: number;
  allowedExtensions?: string[];
}