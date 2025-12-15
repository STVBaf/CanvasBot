'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Calendar as CalendarIcon, ArrowRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import type { Course } from '@/lib/types';

// Helper to assign colors to courses
const getCourseColor = (index: number) => {
  const colors = [
    'bg-orange-100 text-orange-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];
  return colors[index % colors.length];
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(course => {
    const searchValue = searchTerm.trim();
    if (!searchValue) return true; // 空搜索显示所有课程
    
    const courseName = (course.name || '');
    const courseCode = (course.course_code || '');
    
    // 直接匹配，不做大小写转换，确保中文和数字都能正确匹配
    return courseName.includes(searchValue) || courseCode.includes(searchValue);
  });

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">我的课程</h1>
          <p className="text-muted-foreground mt-1">管理和查看所有已同步的课程</p>
        </div>
        <div className="relative w-full md:w-auto">
          <input 
            type="text" 
            placeholder="搜索课程..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 rounded-full bg-white border-none shadow-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-gray-100 rounded-[2rem]" />
          ))}
        </div>
      ) : (
        <motion.div 
          key={searchTerm}
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course, index) => (
              <motion.div variants={item} key={course.id}>
                <Link href={`/dashboard/courses/${course.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer bg-white border-none rounded-[2rem] relative overflow-hidden h-full">
                    <CardContent className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${getCourseColor(index)}`}>
                          <BookOpen className="w-7 h-7" />
                        </div>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                          {course.course_code || 'NO CODE'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-8">
                        <h3 className="font-bold text-xl text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                          {course.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <CalendarIcon className="w-4 h-4" />
                          <span>2025-2026学年第1学期</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex gap-2">
                          {['S1', 'S2', 'S3'].map((tag) => (
                            <span key={tag} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              没有找到匹配的课程
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
