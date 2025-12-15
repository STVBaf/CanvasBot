'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Sparkles, FileText, Users, Calendar, Download, Upload, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserGuidePage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/profile">
            <button className="w-12 h-12 rounded-full bg-white shadow-md hover:shadow-lg transition-all flex items-center justify-center group">
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" />
            </button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              用户指南
            </h1>
            <p className="text-gray-600 mt-1">Canvas EduBot 完整使用教程</p>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* 快速开始 */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  快速开始
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900">欢迎使用 Canvas EduBot！</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Canvas EduBot 是一个智能学习助手，帮助您更高效地管理 Canvas 课程、作业和学习资料。
                  </p>
                  
                  <h4 className="font-semibold text-gray-900 mt-4">首次使用步骤：</h4>
                  <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                    <li>使用 Canvas 账号登录系统</li>
                    <li>在概览页面查看您的所有课程</li>
                    <li>点击课程卡片进入课程详情页</li>
                    <li>系统会自动同步课程文件和作业信息</li>
                    <li>开始使用 AI 功能分析课程和文件</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 主要功能 */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  主要功能
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 课程概览 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 课程概览</h3>
                  <ul className="space-y-2 ml-6 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span>查看所有激活的 Canvas 课程</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span>快速访问课程详情、资料和作业</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span>一键跳转到 Canvas 课程页面</span>
                    </li>
                  </ul>
                </div>

                {/* 智能助教总结 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🤖 智能助教总结</h3>
                  <ul className="space-y-2 ml-6 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>AI 自动分析课程作业、文件等信息</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>生成课程进度智能摘要和学习建议</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>识别课程重点和难点知识</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <span>提供个性化学习建议</span>
                    </li>
                  </ul>
                </div>

                {/* 课程资料 AI 分析 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📄 课程资料 AI 分析</h3>
                  <ul className="space-y-2 ml-6 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>支持 PDF、PPT、Word 等多种文件格式</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>一键生成文件内容摘要</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>提取文档核心知识点</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Markdown 格式化显示，清晰易读</span>
                    </li>
                  </ul>
                </div>

                {/* 作业管理 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📅 作业管理</h3>
                  <ul className="space-y-2 ml-6 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span>查看所有作业的截止日期</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span>按时间顺序排列，不错过任何 DDL</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span>实时显示提交状态（已提交/未提交/已批改）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span>查看作业得分和评语</span>
                    </li>
                  </ul>
                </div>

                {/* 知识库 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📁 知识库</h3>
                  <ul className="space-y-2 ml-6 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>上传本地文件进行 AI 分析</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>支持多种文件格式（PDF、DOC、TXT、MD 等）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>AI 智能提取文档关键信息</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>最大支持 50 MB 文件上传</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 使用技巧 */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  使用技巧
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900">💡 高效使用建议</h3>
                  
                  <h4 className="font-semibold text-gray-900 mt-4">1. 课程总结功能</h4>
                  <ul className="ml-6 space-y-2 text-gray-700">
                    <li>定期生成课程总结，了解学习进度</li>
                    <li>在期中/期末前使用，快速回顾重点</li>
                    <li>根据 AI 建议调整学习策略</li>
                  </ul>

                  <h4 className="font-semibold text-gray-900 mt-4">2. 文件分析功能</h4>
                  <ul className="ml-6 space-y-2 text-gray-700">
                    <li>课前预习：分析教学 PPT，提前了解知识点</li>
                    <li>复习备考：快速提取文档核心内容</li>
                    <li>推荐格式：PDF（解析效果最佳）</li>
                    <li>注意：PPT/PPTX 文件可能解析不完整</li>
                  </ul>

                  <h4 className="font-semibold text-gray-900 mt-4">3. 作业管理</h4>
                  <ul className="ml-6 space-y-2 text-gray-700">
                    <li>每天查看作业列表，避免错过截止日期</li>
                    <li>优先处理红色标记（已逾期）的作业</li>
                    <li>橙色标记表示未提交，绿色表示已完成</li>
                  </ul>

                  <h4 className="font-semibold text-gray-900 mt-4">4. 知识库功能</h4>
                  <ul className="ml-6 space-y-2 text-gray-700">
                    <li>上传课外学习资料进行分析</li>
                    <li>支持各种格式的学习笔记</li>
                    <li>文件大小不超过 50 MB</li>
                    <li>网络较慢时可能需要等待更长时间</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 常见问题 */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileText className="w-6 h-6 text-red-600" />
                  常见问题
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900">❓ 为什么看不到课程文件？</h4>
                      <p className="text-gray-700 mt-2">
                        <strong>答：</strong>首次访问课程详情页时，系统会自动同步文件到数据库。如果没有看到文件，请稍等片刻，系统正在后台处理。您也可以刷新页面重试。
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900">❓ AI 分析需要多长时间？</h4>
                      <p className="text-gray-700 mt-2">
                        <strong>答：</strong>通常 10-30 秒。文件越大、内容越复杂，处理时间越长。如果网络较慢，可能需要更长时间。系统已取消超时限制，请耐心等待。
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900">❓ 支持哪些文件格式？</h4>
                      <p className="text-gray-700 mt-2">
                        <strong>答：</strong>
                      </p>
                      <ul className="ml-6 mt-2 space-y-1 text-gray-700">
                        <li>✅ <strong>推荐：</strong>PDF（效果最佳）</li>
                        <li>✅ <strong>支持：</strong>DOC, DOCX, TXT, MD, JSON, XLS, XLSX</li>
                        <li>⚠️ <strong>部分支持：</strong>PPT, PPTX（可能解析不完整）</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900">❓ 分析失败怎么办？</h4>
                      <p className="text-gray-700 mt-2">
                        <strong>答：</strong>
                      </p>
                      <ul className="ml-6 mt-2 space-y-1 text-gray-700">
                        <li>1. 检查网络连接是否正常</li>
                        <li>2. 确认文件格式是否支持</li>
                        <li>3. 文件大小是否超过 50 MB</li>
                        <li>4. 尝试重新生成或刷新页面</li>
                        <li>5. 如果问题持续，请联系技术支持</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900">❓ 数据安全吗？</h4>
                      <p className="text-gray-700 mt-2">
                        <strong>答：</strong>您的数据安全是我们的首要任务。所有文件分析都通过加密通道传输，不会存储在第三方服务器。课程数据仅保存在本地数据库，仅您有权访问。
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900">❓ 如何退出登录？</h4>
                      <p className="text-gray-700 mt-2">
                        <strong>答：</strong>点击右上角的个人头像，进入个人信息页面，点击"退出登录"按钮即可安全退出。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 技术支持 */}
          <motion.div variants={item}>
            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="w-6 h-6 text-indigo-600" />
                  需要帮助？
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-gray-700">
                  <p className="text-lg">
                    如果您遇到任何问题或有改进建议，欢迎联系我们：
                  </p>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold">📧 邮箱：</span>
                      <a href="mailto:support@canvasedubot.com" className="text-indigo-600 hover:text-indigo-800 underline">
                        support@canvasedubot.com
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold">💬 反馈：</span>
                      <span>在个人信息页面提交您的建议</span>
                    </p>
                  </div>
                  <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-200">
                    <p className="text-sm text-gray-600">
                      💡 <strong>提示：</strong>我们会持续改进 Canvas EduBot，为您提供更好的学习体验。感谢您的使用和支持！
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
