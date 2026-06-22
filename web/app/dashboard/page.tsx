'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, BrainCircuit, ArrowRight, Calendar as CalendarIcon, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import type { Course, StudyGroup, Assignment, User } from '@/lib/types';

// Helper to assign colors to courses
const getCourseColor = (index: number) => {
  const colors = ['bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700'];
  return colors[index % colors.length];
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [urgentDeadlines, setUrgentDeadlines] = useState<Assignment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[Dashboard] Fetching data...');
        
        // Fetch user info
        const userData = await api.getMe();
        setUser(userData);
        
        // Fetch courses first
        const coursesData = await api.getCourses();
        console.log('[Dashboard] Courses:', coursesData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        
        // Fetch groups
        const groupsData = await api.getGroups();
        setMyGroups(groupsData);
        
        if (!Array.isArray(coursesData) || coursesData.length === 0) {
          setAssignments([]);
          setUrgentDeadlines([]);
          setTodayAssignments([]);
          setLoading(false);
          return;
        }
        
        // Fetch assignments for each course
        const assignmentPromises = coursesData.map(course => 
          api.getCourseAssignments(course.id).then(assignments => 
            assignments.map(a => ({
              ...a,
              courseId: String(course.id),
              courseName: a.courseName || course.name
            }))
          ).catch(error => {
            console.error(`[Dashboard] Failed to fetch assignments for course ${course.id}:`, error);
            return [];
          })
        );
        
        const assignmentArrays = await Promise.all(assignmentPromises);
        const allAssignments = assignmentArrays.flat();
        
        // Sort assignments by due date
        const sortedAssignments = allAssignments
          .filter(a => a.dueAt)
          .sort((a, b) => {
            const dateA = new Date(a.dueAt!).getTime();
            const dateB = new Date(b.dueAt!).getTime();
            return dateA - dateB;
          });
        
        setAssignments(sortedAssignments);
        
        // Extract urgent assignments (3 days or less)
        const now = new Date();
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const urgent = sortedAssignments.filter(a => {
          if (!a.dueAt || a.hasSubmitted) return false;
          const dueDate = new Date(a.dueAt);
          return dueDate >= now && dueDate <= threeDaysLater;
        });
        setUrgentDeadlines(urgent);
        
        // Extract today's assignments
        const today = sortedAssignments.filter(a => {
          if (!a.dueAt || a.hasSubmitted) return false;
          const dueDate = new Date(a.dueAt);
          return dueDate.toDateString() === now.toDateString();
        });
        setTodayAssignments(today);
        
        console.log('[Dashboard] Total assignments:', sortedAssignments.length);
        console.log('[Dashboard] Urgent assignments:', urgent.length);
        console.log('[Dashboard] Today assignments:', today.length);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const formatTerm = (startAt: string | null): string => {
    if (!startAt) return '未知学期';
    try {
      const date = new Date(startAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const semester = month >= 9 ? '第1学期' : '第2学期';
      return `${year}-${year + 1}学年${semester}`;
    } catch (e) {
      return '未知学期';
    }
  };

  const getRoleBadge = (group: StudyGroup) => {
    if (group.isCreator) return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">组长</span>;
    if (group.isMember) return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">成员</span>;
    return null;
  };
  
  const formatDueDate = (dateString: string | null | undefined) => {
    if (!dateString) return '无截止日期';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  const getCourseName = (courseId?: string | number) => {
    if (!courseId) return '未知课程';
    const course = courses.find(c => String(c.id) === String(courseId));
    return course ? course.name : '未知课程';
  };
  
  const filteredCourses = courses.filter(course => {
    const searchValue = searchQuery.trim();
    if (!searchValue) return true;
    
    const courseName = (course.name || '');
    const courseCode = (course.course_code || '');
    
    return courseName.includes(searchValue) || courseCode.includes(searchValue);
  });
  
  const filteredAssignments = assignments.filter(assign => {
    const searchValue = searchQuery.trim();
    if (!searchValue) return true;
    
    const assignName = (assign.name || '');
    const courseName = (assign.courseName || '');
    
    return assignName.includes(searchValue) || courseName.includes(searchValue);
  });

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">你好，{user?.name || '同学'}！</h1>
          <p className="text-muted-foreground mt-1">准备好开始今天的学习了吗？</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="搜索课程或资料..." 
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-full bg-card border-none shadow-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <svg className="w-5 h-5 text-muted-foreground absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity">同步数据</button>
        </div>
      </div>

      {searchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-sm text-blue-800">
            搜索 "<span className="font-bold">{searchQuery}</span>" 找到 <span className="font-bold">{filteredCourses.length}</span> 门课程 和 <span className="font-bold">{filteredAssignments.length}</span> 个作业
          </p>
          <button 
            onClick={() => setSearchQuery('')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            清除搜索
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div variants={item}>
            <Card className="bg-[#e8e6df] text-neutral-900 border-none overflow-hidden relative rounded-[2rem]">
              <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between relative z-10">
                <div className="space-y-4 max-w-md">
                  <div className="inline-block px-3 py-1 rounded-full bg-black/5 text-xs font-bold uppercase tracking-wider">今日概览</div>
                  <h2 className="text-3xl font-bold leading-tight">
                    {loading ? '正在加载...' : (
                      <>
                        你今天有 <span className="text-orange-600">{todayAssignments.length} 个作业</span>
                        {todayAssignments.length > 0 ? '需要完成' : '，享受轻松的一天'}
                      </>
                    )}
                  </h2>
                  <div className="flex gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                      <span className="text-sm font-medium">今日到期: {todayAssignments.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium">即将截止: {urgentDeadlines.length}</span>
                    </div>
                  </div>
                  {todayAssignments.length > 0 && (
                    <div className="mt-4 space-y-2 bg-white/50 p-4 rounded-xl">
                      <p className="text-xs font-bold text-gray-600 uppercase">今日作业清单</p>
                      {todayAssignments.slice(0, 3).map((assign, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                          <span className="font-medium truncate">{assign.name}</span>
                        </div>
                      ))}
                      {todayAssignments.length > 3 && (
                        <p className="text-xs text-gray-500 pl-3.5">还有 {todayAssignments.length - 3} 个...</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Courses Grid */}
          <motion.div variants={item}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">我的课程</h2>
          <Link href="/dashboard/courses" className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
            查看全部 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted rounded-[2rem]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(searchQuery ? filteredCourses : courses.slice(0, 4)).map((course, index) => (
              <Link href={`/dashboard/courses/${course.id}`} key={course.id}>
                <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-card border-none rounded-[2rem] relative overflow-hidden h-full">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${getCourseColor(index)}`}>
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <span className="bg-secondary text-muted-foreground px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                        {course.course_code || 'NO CODE'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-8">
                      <h3 className="font-bold text-xl text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>2025-2026学年第1学期</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex gap-2">
                        {['S1', 'S2', 'S3'].map((tag) => (
                          <span key={tag} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div variants={item}>
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">学习小组</h2><Link href="/dashboard/groups" className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1">查看全部 <ArrowRight className="w-4 h-4" /></Link></div>
              <div className="space-y-3">{loading ? <Loader2 className="animate-spin" /> : myGroups.length > 0 ? (myGroups.slice(0, 3).map((group) => (<Link href="/dashboard/groups" key={group.id}><Card className="bg-card hover:bg-secondary transition-colors cursor-pointer border-none shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600"><Users className="w-5 h-5" /></div><div><h4 className="font-bold text-sm text-foreground">{group.name}</h4><p className="text-xs text-muted-foreground">{group.memberCount} 位成员</p></div></div>{getRoleBadge(group)}</CardContent></Card></Link>))) : <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-2xl">暂未加入任何小组</div>}</div>
            </motion.div>
            <motion.div variants={item}>
              <h2 className="text-xl font-bold mb-6">个人知识库</h2>
              <Card className="bg-black text-white h-full"><CardContent className="p-6 flex flex-col justify-between h-full"><div className="flex justify-between items-start"><div className="p-3 bg-white/10 rounded-2xl"><BrainCircuit className="w-6 h-6 text-white" /></div><span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-lg">本周 +12</span></div><div className="mt-6"><div className="text-4xl font-bold mb-1">1,248</div><p className="text-gray-400 text-sm">已收录知识点</p></div><div className="mt-6 space-y-3"><div className="flex justify-between text-xs text-gray-400"><span>同步进度</span><span>85%</span></div><div className="w-full bg-white/10 rounded-full h-2"><div className="bg-white h-2 rounded-full w-[85%]"></div></div></div></CardContent></Card>
            </motion.div>
          </div>
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
          <motion.div variants={item}>
             <Card className="bg-[#2a2a2a] text-white overflow-hidden">
                <CardContent className="p-6 relative">
                  <h3 className="text-lg font-bold mb-2">专注模式</h3>
                  <p className="text-gray-400 text-sm mb-4">开启番茄钟，专注于当前的学习任务。</p>
                  <Link href="/dashboard/focus" className="block w-full py-2 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors text-center">
                    开始专注
                  </Link>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                </CardContent>
             </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}