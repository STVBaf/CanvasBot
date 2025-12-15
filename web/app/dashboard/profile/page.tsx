'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User as UserIcon, Mail, Calendar, Shield, LogOut, Loader2, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('[Profile] Starting to fetch user data...');
        const data = await api.getMe();
        console.log('[Profile] User data received:', data);
        setUser(data);
        setError(null);
      } catch (error: any) {
        console.error('[Profile] Failed to fetch user data:', error);
        setError(error?.response?.data?.message || error?.message || '获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('canvas_token');
    router.push('/');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-foreground">个人主页</h1>
        <p className="text-muted-foreground mt-1">查看和管理你的个人信息</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">正在加载用户信息...</p>
          </motion.div>
        ) : user ? (
          <motion.div 
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Main Profile Card */}
            <motion.div className="lg:col-span-2" variants={itemVariants}>
              <Card className="bg-white border-none shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="pb-6 px-8 pt-8 bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-12 h-12 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{user.name}</h2>
                      <p className="text-sm text-gray-600 mt-1">Canvas 用户</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {/* Email */}
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">邮箱地址</p>
                      <p className="text-base font-bold text-gray-900 mt-1">{user.email}</p>
                    </div>
                  </div>

                  {/* Canvas ID */}
                  {user.canvasId && (
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">Canvas ID</p>
                        <p className="text-base font-bold text-gray-900 mt-1">{user.canvasId}</p>
                      </div>
                    </div>
                  )}

                  {/* Created At */}
                  {user.createdAt && (
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">加入时间</p>
                        <p className="text-base font-bold text-gray-900 mt-1">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* User ID */}
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">系统 ID</p>
                      <p className="text-base font-mono text-gray-900 mt-1 text-sm">{user.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions Card */}
            <motion.div className="space-y-6" variants={itemVariants}>
              {/* Logout Card */}
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-none shadow-sm rounded-[2rem]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">退出登录</h3>
                      <p className="text-xs text-gray-600">退出当前账户</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                  >
                    退出登录
                  </button>
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className="bg-white border-none shadow-sm rounded-[2rem]">
                <CardHeader className="pb-3 pt-6 px-6">
                  <CardTitle className="text-lg">使用统计</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">活跃天数</span>
                      <span className="text-lg font-bold text-gray-900">
                        {user.createdAt ? Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} 天
                      </span>
                    </div>
                    <div className="h-px bg-gray-200"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">当前状态</span>
                      <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        在线
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-none shadow-sm rounded-[2rem]">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2">需要帮助？</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    查看使用指南或联系技术支持
                  </p>
                  <Link 
                    href="/dashboard/user-guide"
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    查看用户指南
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-white border-none shadow-sm rounded-[2rem] p-8">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">无法加载用户信息</h3>
                <p className="text-sm text-muted-foreground mb-4">{error || '请检查网络连接或重新登录'}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-white rounded-full hover:opacity-90 transition-opacity"
                >
                  重新加载
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
