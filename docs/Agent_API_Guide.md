# Agent API 文档

> 状态（2025-12-15）：调用 Agent 需要有效的 **Canvas Access Token**（手动 Token 登录）；后端基于 MySQL/Redis。OAuth2 尚未开放。

Canvas Helper 的 AI Agent 功能基于 Coze 平台，提供课程总结、文档分析、智能对话等功能。

## 📋 目录

- [Agent API 文档](#agent-api-文档)
  - [📋 目录](#-目录)
  - [认证说明](#认证说明)
  - [API 端点](#api-端点)
    - [1. 生成课程总结](#1-生成课程总结)
    - [2. 分析 Canvas 文件](#2-分析-canvas-文件)
    - [3. 上传并分析文件](#3-上传并分析文件)
    - [4. 通用对话](#4-通用对话)
  - [Bot ID 说明](#bot-id-说明)
  - [支持的文件格式](#支持的文件格式)
    - [✅ 完全支持（推荐）](#-完全支持推荐)
    - [⚠️ 部分支持](#️-部分支持)
    - [❌ 不支持](#-不支持)
  - [错误处理](#错误处理)
    - [常见错误码](#常见错误码)
    - [错误响应格式](#错误响应格式)
    - [前端错误处理示例](#前端错误处理示例)
  - [前端集成示例](#前端集成示例)
    - [完整的文件分析组件](#完整的文件分析组件)
    - [API 封装（推荐）](#api-封装推荐)
  - [性能优化建议](#性能优化建议)
  - [更新日志](#更新日志)
    - [v1.1.0 (2025-12-16)](#v110-2025-12-16)
    - [v1.0.0 (2025-12-15)](#v100-2025-12-15)
  - [技术支持](#技术支持)

---

## 认证说明

所有 Agent API 都需要 Canvas 认证。

**请求头**：
```http
Authorization: Bearer YOUR_CANVAS_TOKEN
Content-Type: application/json
```

---

## API 端点

### 1. 生成课程总结

为指定课程生成 AI 总结，自动收集课程的作业、文件等信息。

**🔥 新特性（v1.1.0）**：现在能够**自动下载和分析课程大纲中引用的文件**！如果老师在大纲页面中只放置了文件引用（如.docx、.pdf），而没有纯文字描述，系统会自动下载这些文件并使用AI分析其内容，然后纳入课程总结中。

**端点**：`POST /api/agent/summary`

**请求体**：
```json
{
  "courseId": "34956",
  "text": "可选，手动提供要总结的文本，不提供则自动收集课程内容",
  "botId": "可选，指定使用的 Bot ID，不提供则使用默认 Bot"
}
```

**自动收集的内容包括**：
1. 课程基本信息（名称、代码、简介）
2. 课程大纲文本内容
3. **大纲中引用的文件内容**（最多3个文件，自动下载并分析）
4. 课程作业列表及截止日期
5. 课程文件名称（最多20个）

**响应**：
```json
{
  "content": "AI 生成的课程总结内容...",
  "courseId": "34956",
  "botId": "7582988139266998307",
  "generatedAt": "2025-12-15T00:30:00.000Z"
}
```

**前端示例**：
```typescript
async function generateCourseSummary(courseId: string, botId?: string) {
  const response = await fetch('/api/agent/summary', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${canvasToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      courseId,
      botId 
    }),
  });
  
  const result = await response.json();
  return result.content;
}
```

---

### 2. 分析 Canvas 文件

分析 Canvas LMS 中已存在的文件（通过文件 ID）。

**端点**：`POST /api/agent/analyze-ppt/:fileId`

**URL 参数**：
- `fileId`: Canvas 文件 ID

**请求体**：
```json
{
  "botId": "可选，指定使用的 Bot ID"
}
```

**响应**：
```json
{
  "content": "AI 分析结果...",
  "fileId": "1122601",
  "fileName": "lec12_面向对象方法.pptx",
  "botId": "7582988139266998307",
  "analyzedAt": "2025-12-15T00:35:00.000Z"
}
```

**前端示例**：
```typescript
async function analyzeCanvasFile(fileId: string, botId?: string) {
  const response = await fetch(`/api/agent/analyze-ppt/${fileId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${canvasToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ botId }),
  });
  
  const result = await response.json();
  return result.content;
}
```

**⚠️ 重要说明**：
- 端点名称虽然是 `analyze-ppt`，但实际支持多种文档格式
- **当前限制**：PPT/PPTX 格式可能无法被 Bot 正确解析（Coze Bot 配置问题）
- **推荐使用 PDF 格式**以获得最佳分析效果

---

### 3. 上传并分析文件

直接上传本地文件进行分析（不需要先上传到 Canvas）。

**端点**：`POST /api/agent/analyze-file`

**请求类型**：`multipart/form-data`

**表单字段**：
- `file`: 要分析的文件（必填）
- `botId`: Bot ID（可选）
- `prompt`: 自定义分析提示词（可选）

**支持的文件类型**：
- 文档：PDF, DOC, DOCX
- 表格：XLS, XLSX
- 文本：TXT, MD, JSON
- 演示文稿：PPT, PPTX（⚠️ 当前 Bot 可能无法解析）

**文件大小限制**：50 MB

**响应**：
```json
{
  "content": "AI 分析结果...",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "botId": "7582988139266998307",
  "analyzedAt": "2025-12-15T00:40:00.000Z"
}
```

**前端示例（使用 FormData）**：
```typescript
async function analyzeUploadedFile(file: File, botId?: string, prompt?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (botId) formData.append('botId', botId);
  if (prompt) formData.append('prompt', prompt);
  
  const response = await fetch('/api/agent/analyze-file', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${canvasToken}`,
      // 注意：使用 FormData 时不要设置 Content-Type，浏览器会自动设置
    },
    body: formData,
  });
  
  const result = await response.json();
  return result;
}
```

**React 示例（带文件上传 UI）**：
```tsx
function FileUploadAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const data = await analyzeUploadedFile(file, '7582988139266998307');
      setResult(data.content);
    } catch (error) {
      console.error('分析失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input 
        type="file" 
        accept=".pdf,.doc,.docx,.txt,.md,.json"
        onChange={(e) => setFile(e.target.files?.[0] || null)} 
      />
      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? '分析中...' : '上传并分析'}
      </button>
      {result && <div className="result">{result}</div>}
    </div>
  );
}
```

---

### 4. 通用对话

与 AI Bot 进行自由对话。

**端点**：`POST /api/agent/chat`

**请求体**：
```json
{
  "botId": "7582988139266998307",
  "message": "请解释一下面向对象编程的三大特性",
  "fileUrl": "可选，附带的文件 URL",
  "fileName": "可选，文件名称"
}
```

**响应**：
```json
{
  "content": "AI 回复内容...",
  "botId": "7582988139266998307",
  "repliedAt": "2025-12-15T00:45:00.000Z"
}
```

**前端示例**：
```typescript
async function chatWithBot(message: string, botId: string) {
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${canvasToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      botId,
      message,
    }),
  });
  
  const result = await response.json();
  return result.content;
}
```

---

## Bot ID 说明

每个 AI 功能可以使用不同的专用 Bot。前端可以根据场景选择合适的 Bot：

```typescript
const BotConfig = {
  // 课程总结专用 Bot
  SUMMARY: '7582988139266998307',
  
  // 文档分析专用 Bot
  DOCUMENT_ANALYSIS: '7582988139266998307',
  
  // 作业辅导专用 Bot
  HOMEWORK_HELP: '7582988139266998307',
  
  // 通用聊天 Bot
  GENERAL_CHAT: '7582988139266998307',
};

// 使用示例
await generateCourseSummary(courseId, BotConfig.SUMMARY);
await analyzeCanvasFile(fileId, BotConfig.DOCUMENT_ANALYSIS);
```

**如何获取 Bot ID**：
1. 登录 [Coze 平台](https://www.coze.cn)
2. 进入你的 Bot 设置页面
3. 复制 Bot ID（通常是一串数字）
4. 确保 Bot 已发布到「API」频道

---

## 支持的文件格式

### ✅ 完全支持（推荐）

| 类型 | 格式 | 说明 |
|------|------|------|
| 文档 | PDF | ⭐ 推荐，兼容性最好 |
| 文本 | TXT, MD | ⭐ 推荐，可直接读取内容 |
| 文档 | DOC, DOCX | 支持良好 |
| 表格 | XLS, XLSX | 支持良好 |
| 数据 | JSON | 支持良好 |

### ⚠️ 部分支持

| 类型 | 格式 | 说明 |
|------|------|------|
| 演示文稿 | PPT, PPTX | **当前 Bot 可能无法解析**，建议转换为 PDF |

### ❌ 不支持

- 图片文件（JPG、PNG 等）- 需要特定的多模态 Bot
- 视频/音频文件
- 压缩包（ZIP、RAR 等）
- 其他二进制文件

**建议**：
- 对于 PowerPoint 文件，建议先导出为 PDF 格式再上传
- 纯文本内容使用 TXT 或 MD 格式效果最佳
- 文件大小控制在 50 MB 以内

---

## 错误处理

### 常见错误码

| 状态码 | 错误类型 | 说明 | 解决方案 |
|--------|----------|------|----------|
| 401 | Unauthorized | 缺少或无效的认证令牌 | 检查 Canvas Token 是否有效 |
| 400 | Bad Request | 参数错误或文件类型不支持 | 检查请求参数和文件格式 |
| 4015 | Bot Not Published | Bot 未发布到 API 频道 | 在 Coze 平台发布 Bot |
| 500 | Internal Server Error | 服务器内部错误 | 查看后端日志或联系管理员 |

### 错误响应格式

```json
{
  "statusCode": 400,
  "message": "不支持的文件类型: image/png",
  "error": "Bad Request"
}
```

### 前端错误处理示例

```typescript
async function analyzeFileWithErrorHandling(file: File) {
  try {
    const result = await analyzeUploadedFile(file);
    return { success: true, data: result };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    
    if (error.response?.status === 401) {
      return { success: false, error: '认证失败，请重新登录' };
    } else if (error.response?.status === 400) {
      return { success: false, error: `请求错误: ${errorMessage}` };
    } else if (errorMessage.includes('Bot 未发布')) {
      return { success: false, error: 'AI 服务配置错误，请联系管理员' };
    } else {
      return { success: false, error: '分析失败，请稍后重试' };
    }
  }
}
```

---

## 前端集成示例

### 完整的文件分析组件

```tsx
import { useState } from 'react';

interface AnalysisResult {
  content: string;
  fileName: string;
  analyzedAt: string;
}

export function DocumentAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const canvasToken = localStorage.getItem('canvas_token'); // 或从你的状态管理获取
  
  const handleAnalyze = async () => {
    if (!file) return;
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('botId', '7582988139266998307');
      
      const response = await fetch('/api/agent/analyze-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${canvasToken}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '分析失败');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="document-analyzer">
      <h2>文档分析</h2>
      
      <div className="upload-section">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={loading}
        />
        
        <button onClick={handleAnalyze} disabled={!file || loading}>
          {loading ? '分析中...' : '开始分析'}
        </button>
      </div>
      
      {error && (
        <div className="error">
          ❌ {error}
        </div>
      )}
      
      {result && (
        <div className="result">
          <h3>分析结果</h3>
          <div className="metadata">
            <p>文件名: {result.fileName}</p>
            <p>分析时间: {new Date(result.analyzedAt).toLocaleString()}</p>
          </div>
          <div className="content">
            {result.content}
          </div>
        </div>
      )}
    </div>
  );
}
```

### API 封装（推荐）

创建统一的 API 服务层：

```typescript
// services/agentApi.ts
const API_BASE = '/api/agent';

export class AgentAPI {
  constructor(private token: string) {}
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '请求失败');
    }
    
    return response.json();
  }
  
  // 生成课程总结
  async generateSummary(courseId: string, botId?: string) {
    return this.request('/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, botId }),
    });
  }
  
  // 分析 Canvas 文件
  async analyzeCanvasFile(fileId: string, botId?: string) {
    return this.request(`/analyze-ppt/${fileId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId }),
    });
  }
  
  // 上传并分析文件
  async analyzeFile(file: File, botId?: string, prompt?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (botId) formData.append('botId', botId);
    if (prompt) formData.append('prompt', prompt);
    
    return this.request('/analyze-file', {
      method: 'POST',
      body: formData,
    });
  }
  
  // 通用对话
  async chat(message: string, botId: string) {
    return this.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId, message }),
    });
  }
}

// 使用示例
const agentApi = new AgentAPI(canvasToken);
const summary = await agentApi.generateSummary('34956');
```

---

## 性能优化建议

1. **文件大小控制**
   - 大文件分析可能需要较长时间
   - 建议显示进度提示或加载动画
   - 考虑添加超时处理（建议 2 分钟）

2. **并发控制**
   - 同时分析多个文件时，建议限制并发数
   - 可以使用队列机制依次处理

3. **缓存策略**
   - 对于相同文件的重复分析，可以缓存结果
   - 建议缓存时效为 1 小时

4. **错误重试**
   - 网络错误可以自动重试 1-2 次
   - Bot 配置错误不应重试

---

## 更新日志

### v1.1.0 (2025-12-16)
- 🎉 **新功能**：课程总结现在能够自动下载和分析大纲中引用的文件
- 🎉 **智能解析**：如果大纲页面只包含文件引用而无纯文字，AI会读取文件内容进行总结
- ⚡ **性能优化**：最多处理前3个引用文件，避免超时
- 📚 **支持格式**：PDF、DOCX、TXT、MD 等常见教学文档格式

### v1.0.0 (2025-12-15)
- ✅ 支持课程总结生成
- ✅ 支持 Canvas 文件分析
- ✅ 支持本地文件上传分析
- ✅ 支持通用 AI 对话
- ✅ 支持动态 Bot ID 选择
- ✅ 支持多种文档格式
- ⚠️ 已知限制：PPT/PPTX 格式暂不支持（Bot 配置问题）

---

## 技术支持

如有问题，请查看：
- 后端日志：服务器上的 NestJS 日志输出
- Coze 文档：https://www.coze.cn/docs
- 项目文档：`/docs` 目录下的其他文档

**常见问题**：
1. **Bot 返回"无法读取文件"**
   - 检查文件格式，建议使用 PDF
   - 确认 Bot 已在 Coze 平台配置文档解析插件

2. **文件上传失败**
   - 检查文件大小是否超过 50 MB
   - 确认文件类型在支持列表中

3. **认证失败**
   - 确认 Canvas Token 有效
   - 检查 Token 是否正确传递
