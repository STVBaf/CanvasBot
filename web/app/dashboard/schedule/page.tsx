'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Filter, X, ArrowUpRight, Loader2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Assignment, Course } from '@/lib/types';

export default function SchedulePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [urgentDeadlines, setUrgentDeadlines] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showOnlyNotOverdue, setShowOnlyNotOverdue] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('[Schedule] Fetching data...');
        
        // First fetch courses
        const coursesData = await api.getCourses();
        console.log('[Schedule] Courses:', coursesData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        
        if (!Array.isArray(coursesData) || coursesData.length === 0) {
          console.log('[Schedule] No courses found');
          setAssignments([]);
          setUrgentDeadlines([]);
          setLoading(false);
          return;
        }
        
        // Fetch assignments for each course
        console.log('[Schedule] Fetching assignments for', coursesData.length, 'courses...');
        const assignmentPromises = coursesData.map(course => 
          api.getCourseAssignments(course.id).then(assignments => 
            // Add course info to each assignment
            assignments.map(a => ({
              ...a,
              courseId: String(course.id),
              courseName: a.courseName || course.name
            }))
          ).catch(error => {
            console.error(`[Schedule] Failed to fetch assignments for course ${course.id}:`, error);
            return [];
          })
        );
        
        const assignmentArrays = await Promise.all(assignmentPromises);
        const allAssignments = assignmentArrays.flat();
        console.log('[Schedule] Total assignments fetched:', allAssignments.length);
        
        // Sort assignments by due date (ascending - earliest first)
        const sortedAssignments = allAssignments
          .filter(a => a.dueAt) // Only keep assignments with due dates
          .sort((a, b) => {
            const dateA = new Date(a.dueAt!).getTime();
            const dateB = new Date(b.dueAt!).getTime();
            return dateA - dateB;
          });
        
        console.log('[Schedule] Sorted assignments:', sortedAssignments.length);
        console.log('[Schedule] Sample assignment data:', sortedAssignments.slice(0, 3).map(a => ({
          name: a.name,
          hasSubmitted: a.hasSubmitted,
          submissionStatus: a.submissionStatus,
          dueAt: a.dueAt
        })));
        setAssignments(sortedAssignments);
        
        // Extract urgent assignments (3 days or less)
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const urgent = sortedAssignments.filter(a => {
          if (!a.dueAt) return false;
          const dueDate = new Date(a.dueAt);
          return dueDate >= now && dueDate <= threeDaysLater;
        });
        console.log('[Schedule] Urgent assignments (3 days):', urgent.length);
        setUrgentDeadlines(urgent);
        
      } catch (error) {
        console.error('[Schedule] Failed to fetch data:', error);
        setAssignments([]);
        setUrgentDeadlines([]);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCourseCode = (courseId?: string | number) => {
    if (!courseId) return 'N/A';
    const course = courses.find(c => String(c.id) === String(courseId));
    return course ? course.course_code : 'Unknown';
  };
  
  const getCourseName = (courseId?: string | number) => {
    if (!courseId) return '未知课程';
    const course = courses.find(c => String(c.id) === String(courseId));
    return course ? course.name : '未知课程';
  };
  
  const getCourseColor = (courseId?: string | number) => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-600' },
      { bg: 'bg-green-100', text: 'text-green-600' },
      { bg: 'bg-purple-100', text: 'text-purple-600' },
      { bg: 'bg-pink-100', text: 'text-pink-600' },
      { bg: 'bg-indigo-100', text: 'text-indigo-600' },
      { bg: 'bg-orange-100', text: 'text-orange-600' },
      { bg: 'bg-teal-100', text: 'text-teal-600' },
      { bg: 'bg-cyan-100', text: 'text-cyan-600' },
    ];
    const hash = String(courseId || 0).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const formatDisplayDate = (dateString?: string | null) => {
    if (!dateString) return '无截止日期';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return `明天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDueDate = (dateString?: string | null) => {
    if (!dateString) return '无截止日期';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredAssignments = assignments.filter(assign => {
    // 筛选未完成的作业
    if (showPendingOnly && assign.hasSubmitted) return false;
    
    // 筛选未截止的作业
    if (showOnlyNotOverdue) {
      if (!assign.dueAt) return false;
      const now = new Date();
      const dueDate = new Date(assign.dueAt);
      if (dueDate < now) return false;
    }
    
    return true;
  });

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">日程安排</h1>
        <p className="text-muted-foreground mt-1">查看所有即将到来的截止日期和考试</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={item}>
            <Card className="border-none shadow-sm overflow-hidden bg-card rounded-[2rem]">
              <CardHeader className="border-b border-border pb-4 px-8 pt-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> 作业截止列表</CardTitle>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowOnlyNotOverdue(!showOnlyNotOverdue)} 
                      className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all ${showOnlyNotOverdue ? 'bg-blue-600 text-white shadow-md' : 'bg-secondary text-muted-foreground hover:bg-secondary'}`}
                    >
                      {showOnlyNotOverdue ? <X className="w-4 h-4" /> : <CalendarIcon className="w-4 h-4" />}
                      {showOnlyNotOverdue ? '显示全部' : '只看未截止'}
                    </button>
                    <button 
                      onClick={() => setShowPendingOnly(!showPendingOnly)} 
                      className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all ${showPendingOnly ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-muted-foreground hover:bg-secondary'}`}
                    >
                      {showPendingOnly ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                      {showPendingOnly ? '显示全部' : '只看未完成'}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary text-xs uppercase text-muted-foreground font-medium"><tr><th className="px-8 py-4 text-left tracking-wider w-32">状态</th><th className="px-6 py-4 text-left tracking-wider">作业名称</th><th className="px-6 py-4 text-left tracking-wider w-56">课程</th><th className="px-6 py-4 text-left tracking-wider w-40">截止时间</th><th className="px-6 py-4 text-right tracking-wider whitespace-nowrap w-28">前往课程</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {loading ? (
                        <tr key="loading"><td colSpan={5} className="py-12 text-center"><div className="flex justify-center items-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> 加载中...</div></td></tr>
                      ) : filteredAssignments.length > 0 ? (
                        filteredAssignments.map((assign, index) => (
                          <tr key={`${assign.courseId}-${assign.id}-${index}`} className="group hover:bg-secondary transition-colors">
                            <td className="px-8 py-5 whitespace-nowrap">
                              {assign.submissionStatus === 'graded' ? (
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-xs font-bold">{assign.score !== null ? `${assign.score}/${assign.pointsPossible || '-'}` : '已评分'}</span>
                                </div>
                              ) : assign.hasSubmitted ? (
                                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-xs font-bold">已提交</span>
                                </div>
                              ) : assign.isOverdue ? (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full w-fit">
                                  <X className="w-4 h-4" />
                                  <span className="text-xs font-bold">已逾期</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full w-fit">
                                  <Circle className="w-4 h-4" />
                                  <span className="text-xs font-bold">进行中</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5"><span className="font-bold text-foreground group-hover:text-primary transition-colors text-base line-clamp-1" title={assign.name}>{assign.name}</span></td>
                            <td className="px-6 py-5"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full ${getCourseColor(assign.courseId).bg} flex items-center justify-center flex-shrink-0`}><BookOpen className={`w-5 h-5 ${getCourseColor(assign.courseId).text}`} /></div><div className="flex flex-col"><span className="text-sm font-bold text-foreground">{getCourseCode(assign.courseId)}</span><span className="text-xs text-muted-foreground line-clamp-1" title={assign.courseName || getCourseName(assign.courseId)}>{assign.courseName || getCourseName(assign.courseId)}</span></div></div></td>
                            <td className="px-6 py-5 whitespace-nowrap"><div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><CalendarIcon className="w-4 h-4 text-muted-foreground" />{formatDisplayDate(assign.dueAt)}</div></td>
                            <td className="px-6 py-5 text-right"><Link href={`/dashboard/courses/${assign.courseId}`} title="前往课程详情页" className="inline-flex p-2 rounded-full hover:bg-card hover:shadow-md text-muted-foreground hover:text-primary transition-all cursor-pointer"><ArrowUpRight className="w-5 h-5" /></Link></td>
                          </tr>
                        ))
                      ) : <tr key="empty"><td colSpan={5} className="text-center py-12 text-muted-foreground">没有符合条件的作业 🎉</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div variants={item}>
            <Card className="bg-card sticky top-8 rounded-[2rem] border-none shadow-sm">
              <CardHeader className="pb-2 pt-6 px-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" /> 日历视图
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center mb-4 font-bold text-lg">
                  {new Date().toLocaleString('zh-CN', { month: 'long', year: 'numeric' })}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm mb-4">
                  {['一', '二', '三', '四', '五', '六', '日'].map(d => <div key={d} className="text-muted-foreground text-xs py-1">{d}</div>)}
                  {Array.from({ length: (new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const today = new Date();
                    const isToday = day === today.getDate();
                    
                    // Find assignments for this day
                    const dayAssignments = assignments.filter(a => {
                      if (!a.dueAt) return false;
                      const d = new Date(a.dueAt);
                      return d.getDate() === day && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                    });
                    
                    const hasDeadline = dayAssignments.length > 0;
                    
                    return (
                      <div 
                        key={i} 
                        className={`
                          aspect-square flex flex-col items-center justify-center rounded-full text-sm cursor-pointer hover:bg-secondary relative group
                          ${isToday ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}
                          ${hasDeadline && !isToday ? 'font-bold text-orange-600' : ''}
                        `}
                      >
                        {day}
                        {hasDeadline && (
                          <>
                            <div className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-primary-foreground' : 'bg-orange-500'}`} />

                            {/* Tooltip for assignments */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-card shadow-xl rounded-xl p-3 hidden group-hover:block z-50 border border-border text-left pointer-events-none">
                              <div className="text-xs font-bold text-foreground mb-2 border-b border-border pb-2">
                                {new Date().getMonth() + 1}月{day}日截止 ({dayAssignments.length})
                              </div>
                              <div className="space-y-2">
                                {dayAssignments.map((a, idx) => (
                                  <div key={`${a.id}-${idx}`} className="text-xs">
                                    <div className="font-medium text-foreground truncate" title={a.name}>{a.name}</div>
                                    <div className="text-muted-foreground text-[10px] truncate">{a.courseName || getCourseName(a.courseId)}</div>
                                  </div>
                                ))}
                              </div>
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-card"></div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-4 mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">即将截止 (3天内)</h3>
                  {loading ? <Loader2 className="animate-spin" /> : urgentDeadlines.length > 0 ? (
                    urgentDeadlines.map((item) => (
                      <Link href={`/dashboard/courses/${item.courseId}`} key={item.id} className="block">
                        <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary hover:bg-orange-50 transition-colors group cursor-pointer">
                          <div className="w-2 h-2 mt-2 rounded-full bg-red-500 flex-shrink-0"></div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground group-hover:text-orange-700 truncate">{item.courseName || getCourseName(item.courseId)} • {formatDueDate(item.dueAt)}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : <div className="text-center py-4 text-xs text-muted-foreground">暂无紧急作业 🍵</div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}