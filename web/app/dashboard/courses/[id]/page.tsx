'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Calendar, FileText, ArrowLeft, Sparkles, X, Loader2, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { api } from '@/lib/api';
import type { FileSummary, CourseFile, Assignment, Course } from '@/lib/types';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  // 状态管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<FileSummary | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [aiSummaryContent, setAiSummaryContent] = useState<string>('');
  const [summaryError, setSummaryError] = useState<string>('');

  // 数据状态
  const [course, setCourse] = useState<Course | null>(null);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  // 课程总结状态
  const [courseSummary, setCourseSummary] = useState<string>('');
  const [isLoadingCourseSummary, setIsLoadingCourseSummary] = useState(false);
  const [courseSummaryError, setCourseSummaryError] = useState<string>('');

  // 获取真实数据
  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [coursesResponse, filesResponse, assignmentsResponse] = await Promise.all([
          api.getCourses(),
          api.getCourseFiles(courseId),
          api.getCourseAssignments(courseId)
        ]);
        
        // 从课程列表中找到当前课程
        const currentCourse = coursesResponse.find(c => String(c.id) === String(courseId));
        setCourse(currentCourse || null);
        
        // 确保是数组，并过滤掉可能有问题的文件
        const validFiles = Array.isArray(filesResponse) 
          ? filesResponse.filter(f => f && f.id && f.fileName)
          : [];
        
        setFiles(validFiles);
        
        // 如果数据库中没有文件，自动触发同步
        if (validFiles.length === 0) {
          await handleAutoSync();
        }
        
        // Sort assignments by due date (earliest first)
        if (Array.isArray(assignmentsResponse)) {
          const sortedAssignments = assignmentsResponse
            .filter(a => a.dueAt) // Only keep assignments with due dates
            .sort((a, b) => {
              const dateA = new Date(a.dueAt!).getTime();
              const dateB = new Date(b.dueAt!).getTime();
              return dateA - dateB;
            });
          setAssignments(sortedAssignments);
        } else {
          setAssignments([]);
        }
      } catch (error) {
        console.error("[CourseDetail] Failed to fetch course details:", error);
        setFiles([]);
        setAssignments([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [courseId]);
  
  // 自动同步文件
  const handleAutoSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncMessage('正在同步课程文件...');
    
    try {
      await api.syncCourseFiles(courseId);
      setSyncMessage('文件同步成功，正在刷新...');
      
      // 等待 3 秒让后台任务处理文件元数据
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 重新获取文件列表
      const filesResponse = await api.getCourseFiles(courseId);
      
      // 过滤有效文件
      const validFiles = Array.isArray(filesResponse) 
        ? filesResponse.filter(f => f && f.id && f.fileName)
        : [];
      
      setFiles(validFiles);
      
      setSyncMessage('');
    } catch (error: any) {
      console.error('[CourseDetail] Auto sync failed:', error);
      setSyncMessage('自动同步失败，您可以稍后手动同步');
      setTimeout(() => setSyncMessage(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // 生成课程总结
  const handleGenerateCourseSummary = async () => {
    setIsLoadingCourseSummary(true);
    setCourseSummaryError('');
    
    try {
      const result = await api.generateCourseSummary(courseId, '7582959222351167524');
      setCourseSummary(result.content);
    } catch (error: any) {
      console.error('[CourseDetail] Failed to generate course summary:', error);
      setCourseSummaryError(error.response?.data?.message || error.message || '生成课程总结失败');
    } finally {
      setIsLoadingCourseSummary(false);
    }
  };
  
  // 获取 AI 文件分析
  const handleViewSummary = async (file: CourseFile) => {
    setSelectedFileName(file.fileName);
    setIsModalOpen(true);
    setIsLoadingSummary(true);
    setAiSummaryContent('');
    setSummaryError('');

    try {
      if (!file.canvasFileId) {
        throw new Error('文件 ID 缺失，无法进行分析');
      }
      
      const result = await api.analyzeCanvasFile(file.canvasFileId, '7582988139266998307');
      setAiSummaryContent(result.content);
    } catch (error: any) {
      setSummaryError(error.response?.data?.message || error.message || '文件分析失败');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
  };
  
  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return '无截止日期';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined) return '未知大小';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 relative"
    > 
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-4">
        <Link href="/dashboard/courses" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isLoadingData ? '加载中...' : course ? course.name : '课程详情'}
          </h1>
          <p className="text-muted-foreground">Course ID: {courseId}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-none overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-indigo-900">
                <div className="flex items-center gap-2">
                  <Bot className="w-6 h-6" />
                  智能助教总结
                </div>
                {!courseSummary && !isLoadingCourseSummary && (
                  <button
                    onClick={handleGenerateCourseSummary}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    生成总结
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 min-h-[200px] border border-indigo-100/50">
                {isLoadingCourseSummary ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="ml-3 text-indigo-900 font-medium">AI 正在分析课程内容...</p>
                  </div>
                ) : courseSummaryError ? (
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <X className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="font-medium text-red-900">生成失败</h3>
                    <p className="text-sm text-red-600/80">{courseSummaryError}</p>
                    <button
                      onClick={handleGenerateCourseSummary}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      重试
                    </button>
                  </div>
                ) : courseSummary ? (
                  <div>
                    <MarkdownRenderer content={courseSummary} className="text-gray-800" />
                    <button
                      onClick={handleGenerateCourseSummary}
                      className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                      重新生成
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                      <Bot className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="font-medium text-indigo-900">点击"生成总结"开始</h3>
                    <p className="text-sm text-indigo-600/80 max-w-xs mx-auto">
                      AI 将为你分析课程作业、文件等信息，生成课程进度的智能摘要和学习建议。
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Course Files List */}
           <motion.div variants={item}>
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> 课程资料
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 同步状态提示 */}
              {syncMessage && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                  {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  <span className="text-sm text-blue-700">{syncMessage}</span>
                </div>
              )}
              
              {isLoadingData ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
              ) : files.length > 0 ? (
                <div className="space-y-3">
                  {files.map((file) => {
                    // 添加防御性检查
                    if (!file || !file.id) {
                      console.warn('[CourseDetail] Invalid file object:', file);
                      return null;
                    }
                    
                    return (
                      <div key={file.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 truncate pr-4" title={file.fileName || '未命名文件'}>
                              {file.fileName || '未命名文件'}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(file.createdAt)} · {formatSize(file.fileSize)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleViewSummary(file)}
                            disabled={!file.canvasFileId}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!file.canvasFileId ? '文件 ID 缺失，无法分析' : 'AI 分析文件内容'}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI 总结
                          </button>
                          
                          {file.downloadUrl && (
                            <a 
                              href={file.downloadUrl} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                              title="下载文件"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {isSyncing ? '正在同步文件...' : '暂无文件同步记录'}
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </div>

        {/* Right Column: Assignments */}
        <motion.div variants={item} className="space-y-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> 作业列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                 <div className="space-y-4">
                   {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
                 </div>
              ) : assignments.length > 0 ? (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${assignment.hasSubmitted ? 'bg-green-500' : assignment.isOverdue ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate" title={assignment.name}>{assignment.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">截止: {formatDueDate(assignment.dueAt)}</p>
                      </div>
                      {assignment.submissionStatus === 'graded' ? (
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                          {assignment.score !== null ? `${assignment.score}/${assignment.pointsPossible || '-'}` : '已评分'}
                        </span>
                      ) : assignment.hasSubmitted ? (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                          已提交
                        </span>
                      ) : assignment.isOverdue ? (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full whitespace-nowrap">
                          已逾期
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full whitespace-nowrap">
                          未完成
                        </span>
                      )}
                      {assignment.htmlUrl && (
                        <a href={assignment.htmlUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  暂无作业
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI 总结弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">AI 文件分析</h2>
                  <p className="text-sm text-gray-600 truncate max-w-md" title={selectedFileName}>{selectedFileName}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-8">
              {isLoadingSummary ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                  <p className="text-gray-600 font-medium">AI 正在分析文件内容...</p>
                  <p className="text-sm text-gray-400 mt-2">这可能需要一些时间，请稍候</p>
                </div>
              ) : summaryError ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">分析失败</h3>
                  <p className="text-sm text-gray-600 mb-4">{summaryError}</p>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              ) : aiSummaryContent ? (
                <MarkdownRenderer content={aiSummaryContent} className="text-gray-800" />
              ) : (
                <div className="text-center py-16 text-gray-400">
                  暂无分析结果
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            {!isLoadingSummary && aiSummaryContent && (
              <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}