
import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Course, SyncResponse, FileSummary, StudyGroup, CreateGroupParams, CourseFile, Assignment, User } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// Coze Bot ID 配置
export const BOT_IDS = {
  COURSE_SUMMARY: '7582959222351167524',      // 课程总结 Bot
  FILE_ANALYSIS: '7582988139266998307',       // 文件分析 Bot
} as const;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // timeout: 30000, // 取消默认超时限制，防止网络慢时报错
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('canvas_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('canvas_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  getMe: async (): Promise<User> => { 
    const response = await apiClient.get<User>('/user/me'); 
    return response.data; 
  },
  getCourses: async (): Promise<Course[]> => { const response = await apiClient.get<Course[]>('/courses'); return response.data; },
  syncCourseFiles: async (courseId: string | number): Promise<SyncResponse> => { const response = await apiClient.post<SyncResponse>(`/files/sync?courseId=${courseId}`); return response.data; },
  getFileSummary: async (fileId: string): Promise<FileSummary> => { console.warn("API for getFileSummary is mocked!"); return new Promise((resolve) => { setTimeout(() => { resolve({ fileId, summary: "这份文档主要介绍了课程的核心概念...", keyPoints: ["要点1", "要点2"], actionItems: ["复习", "练习"] }); }, 1500); }); },
  getCourseFiles: async (courseId: string | number): Promise<CourseFile[]> => { 
    try {
      // 首选已同步的数据库文件
      const response = await apiClient.get<{ courseId: string, files: CourseFile[], total: number }>(`/files/course/${courseId}`);
      console.log('[API] getCourseFiles response for course', courseId, ':', response.data);
      
      if (response.data && Array.isArray(response.data.files) && response.data.files.length > 0) {
        console.log('[API] getCourseFiles: Found', response.data.files.length, 'files (synced)');
        return response.data.files;
      }
      
      // Fallback: 直接从 Canvas 实时获取
      console.log('[API] getCourseFiles: Synced files empty, fallback to live Canvas fetch');
      const liveRes = await apiClient.get<{ courseId: string, files: any[], total: number }>(`/files/course/${courseId}/live`);
      if (liveRes.data && Array.isArray(liveRes.data.files)) {
        console.log('[API] getCourseFiles: Live fetch returned', liveRes.data.files.length, 'files');
        
        // 🔑 映射 Canvas API 返回的字段到前端类型
        const mappedFiles: CourseFile[] = liveRes.data.files.map((file: any) => ({
          id: String(file.id),
          canvasFileId: String(file.id),
          fileName: file.fileName || file.displayName || file.filename,  // 优先使用 fileName (已经是 display_name)
          fileSize: file.size || 0,  // 映射 size 到 fileSize
          contentType: file.contentType || null,
          downloadUrl: file.url || '',
          status: 'available',
          createdAt: file.createdAt || new Date().toISOString(),
        }));
        
        return mappedFiles;
      }
      
      // Fallback: try direct array
      if (Array.isArray(response.data)) {
        console.log('[API] getCourseFiles: Direct array with', response.data.length, 'files');
        return response.data;
      }
      
      console.error('[API] getCourseFiles: Unexpected format:', response.data);
      return [];
    } catch (error) {
      console.error('[API] getCourseFiles error:', error);
      return [];
    }
  },
  getCourseAssignments: async (courseId: string | number): Promise<Assignment[]> => { 
    try {
      const response = await apiClient.get<Assignment[]>(`/assignments/course/${courseId}`);
      console.log('[API] getCourseAssignments response for course', courseId, ':', response.data);
      
      // Log first 3 assignments to see submission status
      const assignments = Array.isArray(response.data) ? response.data : (response.data as any).assignments;
      
      if (Array.isArray(assignments) && assignments.length > 0) {
        console.log('[API] getCourseAssignments sample assignments with submission status:');
        assignments.slice(0, 3).forEach((a: any, i: number) => {
          console.log(`  [${i}] ${a.name}:`);
          console.log(`      - hasSubmitted: ${a.hasSubmitted}`);
          console.log(`      - submissionStatus: ${a.submissionStatus}`);
          console.log(`      - dueAt: ${a.dueAt}`);
          console.log(`      - id: ${a.id}`);
        });
      }
      
      // Course assignments API returns direct array according to docs
      if (Array.isArray(response.data)) {
        console.log('[API] getCourseAssignments: Found', response.data.length, 'assignments');
        return response.data;
      }
      
      // Fallback: try to extract from object wrapper
      if (response.data && typeof response.data === 'object' && Array.isArray((response.data as any).assignments)) {
        console.log('[API] getCourseAssignments: Found', (response.data as any).assignments.length, 'assignments in wrapper');
        return (response.data as any).assignments;
      }
      
      console.error('[API] getCourseAssignments: Unexpected format:', response.data);
      return [];
    } catch (error) {
      console.error('[API] getCourseAssignments error:', error);
      return [];
    }
  },
  getUpcomingAssignments: async (days: number = 30): Promise<Assignment[]> => { 
    try {
      const response = await apiClient.get<{ assignments: Assignment[], total: number, daysAhead: number }>('/assignments/upcoming', { params: { days } });
      console.log('[API] getUpcomingAssignments response:', response.data);
      
      if (response.data && Array.isArray(response.data.assignments)) {
        console.log('[API] getUpcomingAssignments: Found', response.data.assignments.length, 'assignments');
        return response.data.assignments;
      }
      
      console.error('[API] getUpcomingAssignments: Expected {assignments: []} but got:', response.data);
      return [];
    } catch (error) {
      console.error('[API] getUpcomingAssignments error:', error);
      return [];
    }
  },
  getUrgentAssignments: async (): Promise<Assignment[]> => { 
    try {
      const response = await apiClient.get<{ assignments?: Assignment[] } | Assignment[]>('/assignments/urgent');
      console.log('[API] getUrgentAssignments response:', response.data);
      
      // Handle both formats: direct array or {assignments: []}
      if (Array.isArray(response.data)) {
        console.log('[API] getUrgentAssignments: Direct array with', response.data.length, 'assignments');
        return response.data;
      }
      
      if (response.data && typeof response.data === 'object' && Array.isArray((response.data as any).assignments)) {
        console.log('[API] getUrgentAssignments: Found', (response.data as any).assignments.length, 'assignments');
        return (response.data as any).assignments;
      }
      
      console.error('[API] getUrgentAssignments: Unexpected format:', response.data);
      return [];
    } catch (error) {
      console.error('[API] getUrgentAssignments error:', error);
      return [];
    }
  },
  // 获取用户加入的小组
  getMyGroups: async (courseId?: string): Promise<StudyGroup[]> => { 
    const url = courseId ? `/groups/my?courseId=${courseId}` : '/groups/my';
    const response = await apiClient.get<{ groups: StudyGroup[] }>(url); 
    return response.data.groups; 
  },
  // 获取所有课程的所有小组（全局公开列表，用于浏览和加入）
  getAllGroups: async (): Promise<StudyGroup[]> => { 
    const response = await apiClient.get<{ groups: StudyGroup[] }>('/groups/all'); 
    return response.data.groups; 
  },
  // 获取课程的所有小组（对所有学生可见）
  getCourseGroups: async (courseId: string): Promise<StudyGroup[]> => { 
    const response = await apiClient.get<{ groups: StudyGroup[] }>(`/groups/course/${courseId}`); 
    return response.data.groups; 
  },
  // 兼容旧接口（建议使用 getCourseGroups）
  getGroups: async (): Promise<StudyGroup[]> => { 
    const response = await apiClient.get<{ groups: StudyGroup[] }>('/groups/my'); 
    return response.data.groups; 
  },
  createGroup: async (params: CreateGroupParams): Promise<StudyGroup> => { const response = await apiClient.post<{ group: StudyGroup }>('/groups', params); return response.data.group; },
  leaveGroup: async (groupId: string): Promise<void> => { await apiClient.post(`/groups/${groupId}/leave`); },
  disbandGroup: async (groupId: string): Promise<void> => { await apiClient.delete(`/groups/${groupId}`); },
  joinGroup: async (groupId: string): Promise<void> => { await apiClient.post(`/groups/${groupId}/join`); },
  
  // Agent AI API
  generateCourseSummary: async (courseId: string | number, botId?: string): Promise<{ content: string; courseId: string; botId: string; generatedAt: string }> => {
    const response = await apiClient.post('/agent/summary', { courseId: String(courseId), botId });
    return response.data;
  },
  
  analyzeCanvasFile: async (fileId: string, botId?: string): Promise<{ content: string; fileId: string; fileName: string; botId: string; analyzedAt: string }> => {
    const response = await apiClient.post(`/agent/analyze-ppt/${fileId}`, { botId });
    return response.data;
  },
  
  analyzeUploadedFile: async (file: File, botId?: string, prompt?: string): Promise<{ content: string; fileName: string; fileSize: number; mimeType: string; botId: string; analyzedAt: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (botId) formData.append('botId', botId);
    if (prompt) formData.append('prompt', prompt);
    
    const response = await apiClient.post('/agent/analyze-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for file upload
    });
    return response.data;
  },
};