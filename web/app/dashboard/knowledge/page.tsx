'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Folder, 
  FileText, 
  MoreVertical, 
  Download, 
  Share2, 
  Trash2, 
  Plus, 
  Filter,
  File,
  FileImage,
  FileCode,
  Clock,
  Upload,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

// Mock Data
const folders = [
  { id: 1, name: 'CS101 计算机导论', count: 12, color: 'bg-blue-100 text-blue-600' },
  { id: 2, name: 'MATH202 线性代数', count: 8, color: 'bg-purple-100 text-purple-600' },
  { id: 3, name: 'ENG105 学术英语', count: 24, color: 'bg-green-100 text-green-600' },
  { id: 4, name: '个人项目', count: 5, color: 'bg-orange-100 text-orange-600' },
];

const recentFiles = [
  { id: 1, name: 'Lecture_05_Slides.pdf', type: 'pdf', size: '2.4 MB', date: '2小时前', course: 'CS101' },
  { id: 2, name: 'Project_Proposal_Draft.docx', type: 'doc', size: '1.1 MB', date: '5小时前', course: '个人项目' },
  { id: 3, name: 'Linear_Algebra_HW3.pdf', type: 'pdf', size: '856 KB', date: '昨天', course: 'MATH202' },
  { id: 4, name: 'main.py', type: 'code', size: '4 KB', date: '昨天', course: 'CS101' },
];

const allFiles = [
  ...recentFiles,
  { id: 5, name: 'Reading_List.txt', type: 'txt', size: '2 KB', date: '2天前', course: 'ENG105' },
  { id: 6, name: 'Lab_Report_Template.docx', type: 'doc', size: '450 KB', date: '3天前', course: 'CS101' },
  { id: 7, name: 'Screenshot_20241210.png', type: 'image', size: '3.2 MB', date: '1周前', course: '个人项目' },
  { id: 8, name: 'Database_Schema.sql', type: 'code', size: '12 KB', date: '1周前', course: '个人项目' },
];

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // 文件上传和分析状态
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string>('');
  
  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult('');
      setAnalysisError('');
    }
  };
  
  // 处理文件分析
  const handleAnalyzeFile = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setAnalysisError('');
    
    try {
      console.log('[Knowledge] Analyzing file:', selectedFile.name);
      const result = await api.analyzeUploadedFile(selectedFile, '7582988139266998307');
      setAnalysisResult(result.content);
      console.log('[Knowledge] File analysis completed');
    } catch (error: any) {
      console.error('[Knowledge] Failed to analyze file:', error);
      setAnalysisError(error.response?.data?.message || error.message || '文件分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 重置上传状态
  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setAnalysisResult('');
    setAnalysisError('');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'doc': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'image': return <FileImage className="w-5 h-5 text-purple-500" />;
      case 'code': return <FileCode className="w-5 h-5 text-green-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredFiles = allFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      className="space-y-8"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">知识库</h1>
          <p className="text-muted-foreground mt-1">集中管理你的课程资料和个人笔记</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="搜索文件..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 bg-white"
            />
          </div>
          <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors" onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">上传文件</span>
          </button>
        </div>
      </div>

      {/* Folders Grid */}
      <motion.div variants={item}>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary" /> 文件夹
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <div 
              key={folder.id}
              className="bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${folder.color} flex items-center justify-center`}>
                  <Folder className="w-5 h-5" />
                </div>
                <button className="text-gray-300 hover:text-gray-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{folder.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{folder.count} 个文件</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Files & All Files Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main File List */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="border-b border-gray-100 pb-4 px-8 pt-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> 所有文件
              </CardTitle>
              <button className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                <Filter className="w-4 h-4" /> 筛选
              </button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 text-xs uppercase text-gray-400 font-medium">
                    <tr>
                      <th className="px-8 py-4 text-left tracking-wider">名称</th>
                      <th className="px-6 py-4 text-left tracking-wider">所属课程</th>
                      <th className="px-6 py-4 text-left tracking-wider">大小</th>
                      <th className="px-6 py-4 text-right tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="group hover:bg-gray-50/80 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors">
                              {getFileIcon(file.type)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{file.date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {file.course}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {file.size}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-primary transition-colors" title="下载">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-primary transition-colors" title="分享">
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors" title="删除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar: Recent Activity / Storage */}
        <motion.div variants={item} className="space-y-6">
          {/* Storage Status */}
          <Card className="bg-black text-white rounded-[2rem] border-none shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">存储空间</h3>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-400">已使用</span>
                <span className="font-medium">4.2 GB / 10 GB</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
                <div className="bg-white h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 p-3 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mb-2"></div>
                  <p className="text-xs text-gray-400">文档</p>
                  <p className="font-bold">2.1 GB</p>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mb-2"></div>
                  <p className="text-xs text-gray-400">图片</p>
                  <p className="font-bold">1.5 GB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white rounded-[2rem] border-none shadow-sm">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" /> 最近访问
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentFiles.slice(0, 3).map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">上次打开: {file.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* 文件上传分析弹窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleCloseModal}>
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">上传并分析文件</h2>
                  <p className="text-sm text-gray-600">支持 PDF、DOC、DOCX、TXT、MD 等格式</p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-8">
              {!selectedFile ? (
                /* 文件选择区域 */
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">拖拽文件到这里或点击上传</h3>
                  <p className="text-sm text-gray-600 mb-4">最大支持 50 MB</p>
                  <input 
                    id="file-upload"
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.txt,.md,.json,.xls,.xlsx"
                    onChange={handleFileSelect}
                  />
                  <button 
                    className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('file-upload')?.click();
                    }}
                  >
                    选择文件
                  </button>
                </div>
              ) : !analysisResult && !isAnalyzing ? (
                /* 文件已选择，等待分析 */
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                    <FileText className="w-10 h-10 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">已选择文件</h3>
                    <p className="text-sm text-gray-600">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      重新选择
                    </button>
                    <button
                      onClick={handleAnalyzeFile}
                      className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                    >
                      <Sparkles className="w-4 h-4" />
                      开始分析
                    </button>
                  </div>
                </div>
              ) : isAnalyzing ? (
                /* 分析中 */
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
                  <p className="text-gray-600 font-medium">AI 正在分析文件内容...</p>
                  <p className="text-sm text-gray-400 mt-2">这可能需要一些时间，请稍候</p>
                </div>
              ) : analysisError ? (
                /* 分析失败 */
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">分析失败</h3>
                  <p className="text-sm text-gray-600 mb-4">{analysisError}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      重新选择
                    </button>
                    <button
                      onClick={handleAnalyzeFile}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      重试
                    </button>
                  </div>
                </div>
              ) : (
                /* 分析结果 */
                <div className="prose prose-sm max-w-none">
                  <div className="mb-4 p-4 bg-purple-50 rounded-xl">
                    <div className="flex items-center gap-2 text-purple-900 mb-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-bold text-sm">{selectedFile.name}</span>
                    </div>
                    <p className="text-xs text-purple-600">分析完成</p>
                  </div>
                  <MarkdownRenderer content={analysisResult} className="text-gray-800" />
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            {analysisResult && (
              <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex justify-between gap-3">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setAnalysisResult('');
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  分析新文件
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
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
