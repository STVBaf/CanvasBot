'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Github, Globe, Shield, Server } from 'lucide-react';

export default function SettingsPage() {
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
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-foreground">设置</h1>
        <p className="text-muted-foreground mt-1">查看系统信息和关于我们</p>
      </motion.div>

      {/* Project Info */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              关于 CanvasEduBot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary/30 flex-shrink-0">
                C
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">CanvasEduBot 智能助教</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  CanvasEduBot 是一个基于 Canvas LMS 的智能教育辅助平台，致力于通过 AI 技术提升学生的学习效率和体验。
                  我们集成了课程管理、智能文件分析、学习小组协作以及专注模式等功能，为您打造一站式的学习环境。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-900 font-medium mb-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  项目主页
                </div>
                <p className="text-sm text-gray-500">https://github.com/STVBaf/CanvasEduBot</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-900 font-medium mb-2">
                  <Github className="w-4 h-4 text-gray-700" />
                  开源协议
                </div>
                <p className="text-sm text-gray-500">MIT License</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Info */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">当前版本</span>
                <span className="font-mono font-medium text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">v1.2.0</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">构建环境</span>
                <span className="text-gray-900">Production</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">最后更新时间</span>
                <span className="text-gray-900">2025-12-16</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">项目地址</span>
                <span className="text-gray-900">https://github.com/STVBaf/CanvasEduBot</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy & Terms */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              隐私与条款
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 space-y-2">
              <p>
                我们非常重视您的隐私保护。CanvasEduBot 仅在您授权的情况下访问您的 Canvas 数据，
                并且所有敏感数据（如 Access Token）都经过加密存储。
              </p>
              <p>
                使用本服务即表示您同意我们的服务条款和隐私政策。
              </p>
            </div>
            <div className="flex gap-4 mt-4">
              <button className="text-sm text-primary hover:underline">服务条款</button>
              <button className="text-sm text-primary hover:underline">隐私政策</button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
