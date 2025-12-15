import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// 清理 AI 返回的 Markdown 内容，去除代码块包裹
const cleanMarkdown = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  
  // 去除开头的 ```markdown, ```md, ``` 等
  cleaned = cleaned.replace(/^```(?:markdown|md)?\s*\n?/i, '');
  // 去除结尾的 ```
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  
  return cleaned.trim();
};

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="my-3 leading-relaxed text-gray-700" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-3 ml-6 list-disc space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-3 ml-6 list-decimal space-y-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed text-gray-700" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-gray-700" {...props}>
      {children}
    </em>
  ),
  code: ({ node, className, children, ...props }: any) => {
    const isInline = !className;
    if (isInline) {
      // 内联代码正常渲染
      return (
        <code
          className="px-1.5 py-0.5 bg-gray-100 text-red-600 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    // 代码块不渲染为黑色背景，而是作为纯文本（防止 AI 返回被包裹的内容）
    return <div className="whitespace-pre-wrap font-mono text-sm text-gray-700">{children}</div>;
  },
  pre: ({ children }) => {
    // 不添加黑色背景的 pre 样式
    return <>{children}</>;
  },
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-600 hover:text-blue-800 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-gray-300" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-100" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-gray-300 px-4 py-2" {...props}>
      {children}
    </td>
  ),
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const cleanedContent = cleanMarkdown(content);
  
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}
