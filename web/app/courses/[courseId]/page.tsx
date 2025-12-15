'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { api } from '@/lib/api';
import type { Assignment } from '@/lib/types';

export default function CourseDetailPage() {
  const params = useParams();
  const courseIdParam = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId; // 获取URL中的课程ID

  const [aiSummary, setAiSummary] = useState("正在生成课程智能总结...");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // 处理 AI 返回的 Markdown 内容，去除可能存在的代码块包裹
  const cleanMarkdown = (text: string) => {
    if (!text) return "";
    let cleaned = text.trim();
    
    // 去除所有代码块标记（支持多种格式）
    // 1. 去除开头的 ```markdown, ```md, ``` 等
    cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/i, '');
    // 2. 去除结尾的 ```
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
    
    return cleaned.trim();
  };

  // 自定义 Markdown 组件，禁止渲染代码块为 <pre><code>
  const markdownComponents: Components = {
    code: ({ node, className, children, ...props }) => {
      const isInline = !className;
      if (isInline) {
        // 内联代码正常渲染
        return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
      }
      // 代码块作为纯文本渲染（防止 AI 返回的内容被包裹）
      return <div className="whitespace-pre-wrap font-mono text-sm">{children}</div>;
    },
    pre: ({ children }) => {
      // 如果遇到 <pre>，直接渲染子元素，不添加任何样式
      return <>{children}</>;
    },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const numericCourseId = Number(courseIdParam);
        if (!numericCourseId || Number.isNaN(numericCourseId)) {
          setAiSummary("课程 ID 无效");
          setAssignments([]);
          return;
        }

        // 1) AI 课程总结
        const summary = await api.generateCourseSummary(numericCourseId).catch(() => null);
        if (summary?.content) {
          setAiSummary(summary.content);
        } else {
          setAiSummary("暂未生成课程总结，稍后重试。");
        }

        // 2) 作业列表（按 DDL 排序）
        const data = await api.getCourseAssignments(numericCourseId);
        const sorted = [...data].sort((a, b) => {
          if (!a.dueAt) return 1;
          if (!b.dueAt) return -1;
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        });
        setAssignments(sorted);
      } catch (error) {
        console.error("获取课程详情失败", error);
        setAiSummary("获取总结失败，请稍后重试。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseIdParam]);

  const renderStatus = (work: Assignment) => {
    if (work.hasSubmitted || work.submissionStatus === 'submitted') {
      return <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">已提交</span>;
    }

    if (work.dueAt && new Date(work.dueAt).getTime() < Date.now()) {
      return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs">已截止</span>;
    }

    return <span className="text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs">进行中</span>;
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <Link href="/courses" className="text-gray-500 hover:text-gray-900">
          &larr; 返回课程列表
        </Link>
        <h1 className="text-2xl font-bold">课程详情 (ID: {courseIdParam})</h1>
        <Link 
          href={`/courses/${courseIdParam}/groups`}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          进入分组协作 &rarr;
        </Link>
      </div>

      <section className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
        <h2 className="text-xl font-bold text-indigo-900 mb-3">🤖 AI 智能总结 (Agent Output)</h2>
        <div className="bg-white p-4 rounded-lg shadow-sm min-h-[100px] prose prose-indigo max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {cleanMarkdown(aiSummary)}
          </ReactMarkdown>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">📅 作业列表 (按 DDL 排序)</h2>
          {loading && <span className="text-sm text-gray-500">加载中...</span>}
        </div>
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          {assignments.length === 0 ? (
            <div className="p-6 text-gray-500">暂无作业</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作业名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">截止时间 (DDL)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((work) => (
                  <tr key={work.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{work.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {work.dueAt ? new Date(work.dueAt).toLocaleString() : '无截止日期'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {renderStatus(work)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}