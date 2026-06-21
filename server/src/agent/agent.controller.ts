import { 
    Controller, 
    Post, 
    Body, 
    Headers, 
    UnauthorizedException, 
    BadRequestException,
    HttpException,
    Logger,
    Param,
    UseInterceptors,
    UploadedFile,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { createHash } from 'crypto';
  import { AgentService } from './agent.service';
  import { CanvasService } from '../canvas/canvas.service';
  import { AssignmentsService } from '../assignments/assignments.service';
  import { FilesService } from '../files/files.service';
  import { PrismaService } from '../prisma/prisma.service';

  const getAgentUploadMaxBytes = () => {
    const configured = Number(process.env.AGENT_UPLOAD_MAX_BYTES);
    return Number.isFinite(configured) && configured > 0
      ? configured
      : 50 * 1024 * 1024;
  };
  
  @Controller('agent')
  export class AgentController {
    private readonly logger = new Logger(AgentController.name);
    private readonly agentBuckets = new Map<string, { count: number; resetAt: number }>();
    private lastLogCleanupAt = 0;
  
    constructor(
      private readonly agentService: AgentService,
      private readonly canvasService: CanvasService,
      private readonly assignmentsService: AssignmentsService,
      private readonly filesService: FilesService,
      private readonly prisma: PrismaService,
    ) {}

    private validateBotId(botId?: string): string | undefined {
      if (!botId) return undefined;

      const allowedBotIds = new Set(
        [
          process.env.COZE_BOT_ID,
          process.env.COZE_PPT_BOT_ID,
          ...(process.env.COZE_ALLOWED_BOT_IDS?.split(',') ?? []),
          // Legacy frontend defaults. Keep them server-side so arbitrary Bot IDs are not accepted.
          '7582959222351167524',
          '7582988139266998307',
        ]
          .map(id => id?.trim())
          .filter((id): id is string => Boolean(id)),
      );

      if (!allowedBotIds.has(botId)) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Bot ID 不在允许列表中',
          error: 'Bad Request',
        });
      }

      return botId;
    }

    private hashAccessToken(accessToken: string): string {
      return createHash('sha256').update(accessToken).digest('hex');
    }

    private async enforceAgentRateLimit(accessToken: string) {
      await this.cleanupExpiredAgentLogs();

      const maxRequests = Number(process.env.AGENT_RATE_LIMIT_MAX ?? 20);
      const windowMs = Number(process.env.AGENT_RATE_LIMIT_WINDOW_MS ?? 60_000);
      const key = this.hashAccessToken(accessToken);
      const now = Date.now();
      const bucket = this.agentBuckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        this.agentBuckets.set(key, { count: 1, resetAt: now + windowMs });
      } else if (bucket.count >= maxRequests) {
        throw new HttpException({
          statusCode: 429,
          message: 'Agent 请求过于频繁，请稍后再试',
          error: 'Too Many Requests',
        }, 429);
      } else {
        bucket.count += 1;
      }

      const windowStart = new Date(now - windowMs);
      const persistedCount = await this.prisma.agentRequestLog.count({
        where: {
          tokenHash: key,
          createdAt: { gte: windowStart },
        },
      });

      if (persistedCount >= maxRequests) {
        throw new HttpException({
          statusCode: 429,
          message: 'Agent 请求配额已用尽，请稍后再试',
          error: 'Too Many Requests',
        }, 429);
      }
    }

    private async cleanupExpiredAgentLogs() {
      const retentionDays = Number(process.env.AGENT_LOG_RETENTION_DAYS ?? 90);
      if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;

      const now = Date.now();
      if (now - this.lastLogCleanupAt < 60 * 60 * 1000) return;
      this.lastLogCleanupAt = now;

      const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000);
      try {
        const agentRequestLog = (this.prisma as any).agentRequestLog;
        if (!agentRequestLog?.deleteMany) return;

        await agentRequestLog.deleteMany({
          where: { createdAt: { lt: cutoff } },
        });
      } catch (error) {
        this.logger.warn(`Agent log cleanup failed: ${error}`);
      }
    }

    private async auditAgentRequest(
      accessToken: string,
      botId: string | undefined,
      action: string,
      status: 'success' | 'failed',
      durationMs: number,
      error?: unknown,
    ) {
      const message = error instanceof Error ? error.message : String(error ?? '');
      try {
        await this.prisma.agentRequestLog.create({
          data: {
            tokenHash: this.hashAccessToken(accessToken),
            botId: botId ?? null,
            action,
            status,
            durationMs,
            error: status === 'failed' ? message.slice(0, 191) : null,
          },
        });
      } catch (auditError) {
        this.logger.warn(`Agent audit log failed: ${auditError}`);
      }
    }

    private async withAgentAudit<T>(
      accessToken: string,
      botId: string | undefined,
      action: string,
      handler: () => Promise<T>,
    ): Promise<T> {
      const startedAt = Date.now();
      try {
        const result = await handler();
        await this.auditAgentRequest(accessToken, botId, action, 'success', Date.now() - startedAt);
        return result;
      } catch (error) {
        await this.auditAgentRequest(accessToken, botId, action, 'failed', Date.now() - startedAt, error);
        throw error;
      }
    }

    private hasAllowedFileSignature(file: Express.Multer.File): boolean {
      const name = file.originalname.toLowerCase();
      const header = file.buffer.subarray(0, 8).toString('hex');
      const ascii = file.buffer.subarray(0, 8).toString('ascii');

      if (name.match(/\.(txt|md|json)$/i) || file.mimetype.startsWith('text/')) {
        return true;
      }

      if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
        return ascii.startsWith('%PDF');
      }

      if (name.match(/\.(docx|pptx|xlsx)$/i)) {
        return header.startsWith('504b0304');
      }

      if (name.match(/\.(doc|ppt|xls)$/i)) {
        return header.startsWith('d0cf11e0a1b11ae1');
      }

      return false;
    }
  
    /**
     * 生成课程 AI 总结
     * POST /api/agent/summary
     */
    @Post('summary')
    async generateCourseSummary(
      @Body() body: { courseId: string; text?: string; botId?: string },
      @Headers('authorization') authHeader?: string
    ) {
      // 1. 验证认证
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: '缺少认证令牌，请先登录',
          error: 'Unauthorized'
        });
      }
  
      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Token 格式无效',
          error: 'Unauthorized'
        });
      }
      await this.enforceAgentRateLimit(token);
      const botId = this.validateBotId(body.botId);
  
      // 2. 验证参数
      if (!body.courseId) {
        throw new BadRequestException({
          statusCode: 400,
          message: '缺少课程 ID',
          error: 'Bad Request'
        });
      }
  
      return this.withAgentAudit(token, botId, 'course-summary', async () => {
      try {
        // 3. 如果没有提供文本，则自动收集课程内容
        if (!body.text) {
          this.logger.log(`开始收集课程 ${body.courseId} 的内容...`);
          const { text, files } = await this.collectCourseContent(token, body.courseId);
          
          // 4. 调用 Agent 生成总结（同时发送文本和文件）
          this.logger.log(`开始生成课程 ${body.courseId} 的 AI 总结 (文本: ${text.length}字符, 文件: ${files.length}个)...`);
          const summary = await this.agentService.generateSummaryWithFiles(text, files, botId);

          return {
            content: summary,
            courseId: body.courseId,
            botId,
            generatedAt: new Date().toISOString(),
          };
        } else {
          // 如果提供了文本，使用原来的方法
          this.logger.log(`开始生成课程 ${body.courseId} 的 AI 总结...`);
          const summary = await this.agentService.generateSummary(body.text, botId);

          return {
            content: summary,
            courseId: body.courseId,
            botId,
            generatedAt: new Date().toISOString(),
          };
        }
      } catch (error: any) {
        this.logger.error(`生成课程总结失败: ${error?.message || error}`, error?.stack);
        throw error;
      }
      });
    }
  
    /**
     * 收集课程内容（作业、文件等）
     * @returns { text: string, files: Array<{ buffer, fileName, contentType }> }
     */
    private async collectCourseContent(
      accessToken: string, 
      courseId: string
    ): Promise<{ text: string; files: Array<{ buffer: Buffer; fileName: string; contentType: string }> }> {
      const parts: string[] = [];
      const syllabusFiles: Array<{ buffer: Buffer; fileName: string; contentType: string }> = [];

      // 统一的截断工具，避免 Coze 输入过长
      const truncate = (text: string, max: number) => {
        if (!text) return '';
        return text.length <= max ? text : `${text.slice(0, max)}...`;
      };

      // 最终组装时控制总长（优先级：课程简介/大纲 > 作业 > 文件名）
      const appendWithBudget = (arr: string[], budget: { remain: number }, chunk: string) => {
        if (!chunk) return;
        const safe = truncate(chunk, budget.remain);
        if (safe.length === 0) return;
        arr.push(safe);
        budget.remain -= safe.length;
      };

      const budget = { remain: 20000 }; // 🔑 扩大总预算到 20000 字符，确保大纲完整传递
  
      try {
        // 1. 获取课程基本信息
        const courses = await this.canvasService.getCourses(accessToken);
        const course = courses.find((c: any) => String(c.id) === String(courseId));
        
        if (course) {
          appendWithBudget(parts, budget, `课程名称: ${course.name || '未知'}`);
          appendWithBudget(parts, budget, `课程代码: ${course.course_code || '未知'}`);
          if (course.description) {
            const cleanDesc = course.description
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            appendWithBudget(parts, budget, `课程描述: ${truncate(cleanDesc, 300)}`);
          }
          appendWithBudget(parts, budget, '\n');
        }
  
        // 2. 获取作业信息
        try {
          const assignments = await this.assignmentsService.getCourseAssignments(accessToken, courseId);
          if (assignments.length > 0 && budget.remain > 0) {
            appendWithBudget(parts, budget, '=== 作业列表（最多8条，含描述摘要） ===');
            assignments.slice(0, 8).forEach((assignment: any) => {
              appendWithBudget(parts, budget, `作业: ${assignment.name}`);
              if (assignment.description && budget.remain > 0) {
                const textDesc = assignment.description
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
                if (textDesc) {
                  appendWithBudget(parts, budget, `  描述: ${truncate(textDesc, 200)}`);
                }
              }
              if (assignment.dueAt && budget.remain > 0) {
                appendWithBudget(parts, budget, `  截止时间: ${assignment.dueAt}`);
              }
              appendWithBudget(parts, budget, '');
            });
          }
        } catch (error: any) {
          this.logger.warn(`获取作业信息失败: ${error?.message || error}`);
        }
  
        // 3. 获取课程大纲（syllabus）
        try {
          this.logger.log(`尝试获取课程 ${courseId} 的大纲...`);
          const syllabus = await this.canvasService.getCourseSyllabus(accessToken, courseId);
          if (syllabus?.text) {
            this.logger.log(`✅ 课程大纲获取成功，文本长度: ${syllabus.text.length}，引用文件: ${syllabus.files?.length || 0}`);
            appendWithBudget(parts, budget, '=== 课程大纲（完整） ===');
            // 🔑 取消大纲字数限制，传递完整内容
            appendWithBudget(parts, budget, syllabus.text);
            appendWithBudget(parts, budget, '');
          } else {
            this.logger.warn(`⚠️  课程 ${courseId} 的大纲为空`);
          }

          // 🔑 下载大纲中引用的文件（不分析，稍后一起发送给 Agent）
          if (syllabus?.files?.length) {
            this.logger.log(`开始下载大纲引用的 ${syllabus.files.length} 个文件...`);
            
            for (const file of syllabus.files.slice(0, 3)) { // 最多处理3个文件
              try {
                this.logger.log(`正在下载文件: ${file.name} (ID: ${file.id})`);
                const fileContent = await this.filesService.downloadSingleFile(accessToken, file.id);
                
                // 添加到文件列表中（稍后一起发送给 Agent）
                syllabusFiles.push({
                  buffer: fileContent.buffer,
                  fileName: fileContent.fileName,
                  contentType: fileContent.contentType,
                });
                
                this.logger.log(`✅ 文件下载完成: ${file.name} (${this.formatBytes(fileContent.size)})`);
              } catch (fileError: any) {
                this.logger.warn(`文件 ${file.name} 下载失败: ${fileError?.message || fileError}`);
              }
            }
          }
        } catch (error: any) {
          this.logger.warn(`获取课程大纲失败: ${error?.message || error}`);
        }

        // 4. 获取文件信息（只取文件名，最多20个）
        try {
          const files = await this.filesService.getCourseFilesFromCanvas(accessToken, courseId);
          if (files.length > 0 && budget.remain > 0) {
            appendWithBudget(parts, budget, '=== 课程文件（最多20个文件名）===');
            files.slice(0, 20).forEach((file: any) => {
              if (budget.remain <= 0) return;
              appendWithBudget(parts, budget, `文件: ${file.displayName || file.fileName}`);
            });
          }
        } catch (error: any) {
          this.logger.warn(`获取文件信息失败: ${error?.message || error}`);
        }
  
        const fullText = parts.join('\n');
        
        if (fullText.trim().length === 0 && syllabusFiles.length === 0) {
          return { text: `课程ID: ${courseId} 的相关信息`, files: [] };
        }

        return { text: fullText, files: syllabusFiles };
      } catch (error: any) {
        this.logger.error(`收集课程内容失败: ${error?.message || error}`);
        // 如果收集失败，至少返回课程ID
        return { text: `课程ID: ${courseId} 的相关信息`, files: [] };
      }
    }

    /**
     * 格式化字节数为可读形式
     */
    private formatBytes(bytes: number): string {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    /**
     * 分析PPT课件（通过Canvas文件ID）
     * POST /api/agent/analyze-ppt/:fileId
     */
    @Post('analyze-ppt/:fileId')
    async analyzePPTByFileId(
      @Param('fileId') fileId: string,
      @Body() body: { botId?: string } = {},
      @Headers('authorization') authHeader?: string
    ) {
      // 1. 验证认证
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: '缺少认证令牌，请先登录',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Token 格式无效',
          error: 'Unauthorized'
        });
      }
      await this.enforceAgentRateLimit(token);
      const botId = this.validateBotId(body.botId);

      return this.withAgentAudit(token, botId, 'analyze-ppt-file', async () => {
      try {
        // 2. 下载文件内容
        this.logger.log(`开始下载文件 ${fileId}...`);
        const fileInfo = await this.filesService.downloadSingleFile(token, fileId);
        
        // 打印详细的文件信息用于调试
        this.logger.debug(`文件下载完成:
  - 文件名: ${fileInfo.fileName}
  - Content-Type: ${fileInfo.contentType}
  - 文件大小: ${fileInfo.size} bytes
  - Buffer 有效: ${Buffer.isBuffer(fileInfo.buffer)}
  - Buffer 长度: ${fileInfo.buffer?.length || 0}
  - 文件头 (hex): ${fileInfo.buffer?.slice(0, 8).toString('hex') || 'N/A'}`);
        
        // 验证是否为 Office 文件（检查文件头）
        if (fileInfo.buffer && fileInfo.buffer.length >= 4) {
          const fileHeader = fileInfo.buffer.slice(0, 4).toString('hex');
          const isPKZip = fileHeader === '504b0304'; // PK zip format (docx, pptx, xlsx)
          this.logger.debug(`文件格式检查: ${isPKZip ? 'ZIP/Office 格式 ✅' : '其他格式 (header: ' + fileHeader + ')'}`);
        }
        
        // 检查文件类型（不仅限于PPT，支持所有文档）
        const isDocument = fileInfo.contentType?.includes('presentation') || 
                          fileInfo.contentType?.includes('document') ||
                          fileInfo.contentType?.includes('pdf') ||
                          fileInfo.contentType?.includes('text') ||
                          fileInfo.fileName?.match(/\.(ppt|pptx|doc|docx|pdf|txt|md)$/i);
        
        if (!isDocument) {
          this.logger.warn(`文件类型可能不支持: ${fileInfo.contentType}`);
        }

        // 3. 使用文件 buffer 调用 Agent 分析
        this.logger.log(`开始分析文件: ${fileInfo.fileName} (${fileInfo.size} bytes)...`);
        const analysis = await this.agentService.analyzeFile(
          fileInfo.buffer,      // 传递文件 buffer
          fileInfo.fileName,
          fileInfo.contentType || 'application/octet-stream',
          botId                 // 传递 botId
        );

        return {
          content: analysis,
          fileId: fileId,
          fileName: fileInfo.fileName,
          botId,
          analyzedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        this.logger.error(`分析PPT失败: ${error?.message || error}`, error?.stack);
        if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
          throw error;
        }
        throw new BadRequestException({
          statusCode: 500,
          message: `分析PPT失败: ${error?.message || '未知错误'}`,
          error: 'Internal Server Error'
        });
      }
      });
    }

    /**
     * 分析PPT课件（通过课程ID和文件名查找）
     * POST /api/agent/analyze-ppt
     */
    @Post('analyze-ppt')
    async analyzePPTByCourse(
      @Body() body: { courseId: string; fileName?: string; fileId?: string; botId?: string },
      @Headers('authorization') authHeader?: string
    ) {
      // 1. 验证认证
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: '缺少认证令牌，请先登录',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Token 格式无效',
          error: 'Unauthorized'
        });
      }
      const botId = this.validateBotId(body.botId);

      // 2. 验证参数
      if (!body.courseId && !body.fileId) {
        throw new BadRequestException({
          statusCode: 400,
          message: '缺少课程ID或文件ID',
          error: 'Bad Request'
        });
      }

      return this.withAgentAudit(token, botId, 'analyze-ppt-course', async () => {
      try {
        let fileId = body.fileId;
        let fileName = body.fileName;

        // 3. 如果没有提供fileId，从课程文件中查找PPT
        if (!fileId && body.courseId) {
          this.logger.log(`在课程 ${body.courseId} 中查找PPT文件...`);
          const files = await this.filesService.getCourseFilesFromCanvas(token, body.courseId);
          
          // 查找PPT文件
          const pptFiles = files.filter((file: any) => 
            file.contentType?.includes('presentation') || 
            file.fileName?.match(/\.(ppt|pptx)$/i) ||
            file.displayName?.match(/\.(ppt|pptx)$/i)
          );

          if (pptFiles.length === 0) {
            throw new BadRequestException({
              statusCode: 404,
              message: '该课程中没有找到PPT文件',
              error: 'Not Found'
            });
          }

          // 如果指定了文件名，查找匹配的文件（支持模糊匹配）
          if (fileName) {
            const matchedFile = pptFiles.find((file: any) => {
              const name1 = file.fileName || '';
              const name2 = file.displayName || '';
              // 精确匹配
              if (name1 === fileName || name2 === fileName) return true;
              // 模糊匹配（包含关键词）
              if (name1.includes(fileName) || name2.includes(fileName)) return true;
              // 移除扩展名后匹配
              const nameWithoutExt = fileName.replace(/\.(ppt|pptx)$/i, '');
              if (name1.includes(nameWithoutExt) || name2.includes(nameWithoutExt)) return true;
              return false;
            });
            
            if (matchedFile) {
              fileId = matchedFile.id;
              fileName = matchedFile.displayName || matchedFile.fileName;
            } else {
              // 返回可用的PPT文件列表帮助用户选择
              const availableFiles = pptFiles.map((f: any) => ({
                id: f.id,
                name: f.displayName || f.fileName
              }));
              throw new BadRequestException({
                statusCode: 404,
                message: `未找到文件名包含 "${fileName}" 的PPT文件`,
                error: 'Not Found',
                availableFiles: availableFiles.slice(0, 10), // 返回前10个可用文件
              });
            }
          } else {
            // 使用第一个PPT文件
            fileId = pptFiles[0].id;
            fileName = pptFiles[0].displayName || pptFiles[0].fileName;
          }
        }

        // 4. 调用分析接口
        if (!fileId) {
          throw new BadRequestException({
            statusCode: 400,
            message: '无法确定要分析的文件',
            error: 'Bad Request'
          });
        }

        return await this.analyzePPTByFileId(fileId, { botId }, authHeader);
      } catch (error: any) {
        this.logger.error(`分析PPT失败: ${error?.message || error}`, error?.stack);
        if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
          throw error;
        }
        throw new BadRequestException({
          statusCode: 500,
          message: `分析PPT失败: ${error?.message || '未知错误'}`,
          error: 'Internal Server Error'
        });
      }
      });
    }

    /**
     * 通用 Agent 对话接口
     * POST /api/agent/chat
     * 支持任意 Bot ID 和对话内容
     */
    @Post('chat')
    async chatWithAgent(
      @Body() body: { 
        botId: string;
        message: string;
        fileUrl?: string;
        fileName?: string;
      },
      @Headers('authorization') authHeader?: string
    ) {
      // 1. 验证认证
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: '缺少认证令牌，请先登录',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Token 格式无效',
          error: 'Unauthorized'
        });
      }
      await this.enforceAgentRateLimit(token);
      const botId = this.validateBotId(body.botId);

      // 2. 验证参数
      if (!botId) {
        throw new BadRequestException({
          statusCode: 400,
          message: '缺少 Bot ID',
          error: 'Bad Request'
        });
      }

      if (!body.message) {
        throw new BadRequestException({
          statusCode: 400,
          message: '缺少对话内容',
          error: 'Bad Request'
        });
      }

      return this.withAgentAudit(token, botId, 'agent-chat', async () => {
      try {
        this.logger.log(`开始与 Agent ${botId} 对话...`);
        
        // 3. 调用通用对话方法
        const response = await this.agentService.chatWithBot(
          botId,
          body.message,
          body.fileUrl,
          body.fileName
        );

        return {
          content: response,
          botId,
          message: body.message,
          respondedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        this.logger.error(`Agent 对话失败: ${error?.message || error}`, error?.stack);
        throw new BadRequestException({
          statusCode: 500,
          message: `Agent 对话失败: ${error?.message || '未知错误'}`,
          error: 'Internal Server Error'
        });
      }
      });
    }
    /**
     * 通用文件上传并分析
     * POST /api/agent/analyze-file
     * 支持：PDF, DOC/DOCX, PPT/PPTX, TXT, XLS/XLSX 等
     */
    @Post('analyze-file')
    @UseInterceptors(FileInterceptor('file', {
      limits: {
        fileSize: getAgentUploadMaxBytes(),
      },
      fileFilter: (req, file, cb) => {
        // 支持的文件类型
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/markdown',
          'application/json',
        ];
        
        const allowedExts = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|md|json)$/i;
        
        if (allowedMimes.includes(file.mimetype) || allowedExts.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new BadRequestException({
            statusCode: 400,
            message: `不支持的文件类型: ${file.mimetype}。支持的格式: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, MD, JSON`,
            error: 'Bad Request'
          }), false);
        }
      },
    }))
    async analyzeUploadedFile(
      @UploadedFile() file: Express.Multer.File,
      @Body() body: { botId?: string; prompt?: string },
      @Headers('authorization') authHeader?: string
    ) {
      // 1. 验证认证
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: '缺少认证令牌，请先登录',
          error: 'Unauthorized'
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Token 格式无效',
          error: 'Unauthorized'
        });
      }
      await this.enforceAgentRateLimit(token);
      const botId = this.validateBotId(body.botId);

      // 2. 验证文件
      if (!file) {
        throw new BadRequestException({
          statusCode: 400,
          message: '请上传文件',
          error: 'Bad Request'
        });
      }

      if (!this.hasAllowedFileSignature(file)) {
        throw new BadRequestException({
          statusCode: 400,
          message: '文件内容与允许的文件类型不匹配',
          error: 'Bad Request',
        });
      }

      return this.withAgentAudit(token, botId, 'analyze-uploaded-file', async () => {
      try {
        this.logger.log(`收到文件上传: ${file.originalname}, 大小: ${file.size} bytes, 类型: ${file.mimetype}`);

        // 3. 调用 Agent 分析文件
        const analysis = await this.agentService.analyzeFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          botId,
          body.prompt
        );

        return {
          content: analysis,
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          botId,
          analyzedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        this.logger.error(`分析文件失败: ${error?.message || error}`, error?.stack);
        if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
          throw error;
        }
        throw new BadRequestException({
          statusCode: 500,
          message: `分析文件失败: ${error?.message || '未知错误'}`,
          error: 'Internal Server Error'
        });
      }
      });
    }  }
