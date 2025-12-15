import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  /**
   * 生成内容总结
   * @param text 要总结的文本内容
   * @param botId Bot ID（可选，不提供则使用环境变量默认值）
   */
  async generateSummary(text: string, botId?: string): Promise<string> {
    const cozeToken = process.env.COZE_API_TOKEN;
    const defaultBotId = process.env.COZE_BOT_ID;
    const finalBotId = botId || defaultBotId;
    const baseUrl = process.env.COZE_BASE_URL || 'https://api.coze.cn';

    if (!cozeToken) {
      this.logger.error('❌ 未配置 COZE_API_TOKEN');
      return '（AI 服务配置缺失：缺少 API Token）';
    }

    if (!finalBotId) {
      this.logger.error('❌ 未提供 Bot ID 且环境变量未配置 COZE_BOT_ID');
      return '（AI 服务配置缺失：缺少 Bot ID）';
    }

    try {
      // 🔑 不再截断文本，传递完整内容给 Coze
      const fullPrompt = `请总结以下课程内容，提取核心知识点和考核重点：\n\n${text}`;
      
      this.logger.log(`调用 Coze 生成总结，内容长度: ${text.length} 字符`);

      // 1. 发起对话 (Create Chat)
      const createRes = await axios.post(
        `${baseUrl}/v3/chat`,
        {
          bot_id: finalBotId,
          user_id: 'canvas_student_user',
          stream: false,
          auto_save_history: true,
          additional_messages: [
            {
              role: 'user',
              content: fullPrompt,
              content_type: 'text',
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${cozeToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const chatId = createRes.data.data.id;
      const conversationId = createRes.data.data.conversation_id;

      // 2. 轮询等待 AI 思考完成
      let status = createRes.data.data.status;
      let retryCount = 0;

      while (status === 'in_progress' && retryCount < 40) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const retrieveRes = await axios.get(
          `${baseUrl}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );
        
        status = retrieveRes.data.data.status;
        retryCount++;
        
        if (status === 'failed' || status === 'requires_action') {
          return '（AI 处理中断或失败）';
        }
      }

      // 3. 获取回复消息
      if (status === 'completed') {
        const listRes = await axios.get(
          `${baseUrl}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );

        // 找到 AI 回复的那条消息
        const messages = listRes.data.data;
        const answerMsg = messages.find((msg: any) => msg.type === 'answer' && msg.role === 'assistant');

        return answerMsg ? answerMsg.content : '（AI 未返回有效总结）';
      }

      return '（AI 响应超时）';

    } catch (error: any) {
      this.logger.error(`调用 Coze API 失败: ${error?.response?.data?.msg || error?.message || error}`);
      return '（AI 服务暂时不可用）';
    }
  }

  /**
   * 分析PPT课件
   * @param fileUrl PPT文件的URL或文件内容描述
   * @param fileName 文件名（可选）
   * @param fileContent 文件内容描述（如果无法直接传文件，可以传文本描述）
   * @param botId Bot ID（可选，不提供则使用环境变量默认值）
   */
  async analyzePPT(fileUrl: string, fileName?: string, fileContent?: string, botId?: string): Promise<string> {
    const cozeToken = process.env.COZE_API_TOKEN;
    const defaultPptBotId = process.env.COZE_PPT_BOT_ID;
    const finalBotId = botId || defaultPptBotId;
    const baseUrl = process.env.COZE_BASE_URL || 'https://api.coze.cn';

    if (!cozeToken) {
      this.logger.error('❌ 未配置 COZE_API_TOKEN');
      return '（AI 服务配置缺失：缺少 API Token）';
    }

    if (!finalBotId) {
      this.logger.error('❌ 未提供 Bot ID 且环境变量未配置 COZE_PPT_BOT_ID');
      return '（AI 服务配置缺失：缺少 Bot ID）';
    }

    try {
      // 构建提示词
      let prompt = '请分析这个PPT课件，给出详细的解读，包括：\n';
      prompt += '1. 课件的主要内容和结构\n';
      prompt += '2. 每个章节的核心知识点\n';
      prompt += '3. 重点和难点解析\n';
      prompt += '4. 学习建议和思考题\n\n';

      if (fileName) {
        prompt += `文件名: ${fileName}\n`;
      }

      if (fileContent) {
        // 如果提供了文件内容描述（如提取的文本）
        prompt += `课件内容:\n${fileContent.slice(0, 8000)}\n`;
      } else if (fileUrl) {
        // 如果提供了文件URL，告诉AI文件位置
        prompt += `课件文件URL: ${fileUrl}\n`;
        prompt += '请分析该PPT课件的内容。';
      }

      // 1. 发起对话
      const createRes = await axios.post(
        `${baseUrl}/v3/chat`,
        {
          bot_id: finalBotId,
          user_id: 'canvas_student_user',
          stream: false,
          auto_save_history: true,
          additional_messages: [
            {
              role: 'user',
              content: prompt,
              content_type: 'text',
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${cozeToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const chatId = createRes.data.data.id;
      const conversationId = createRes.data.data.conversation_id;

      // 2. 轮询等待 AI 思考完成
      let status = createRes.data.data.status;
      let retryCount = 0;
      const maxRetries = 60; // PPT分析可能需要更长时间

      while (status === 'in_progress' && retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2秒轮询一次
        
        const retrieveRes = await axios.get(
          `${baseUrl}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );
        
        status = retrieveRes.data.data.status;
        retryCount++;
        
        if (status === 'failed' || status === 'requires_action') {
          return '（AI 处理中断或失败）';
        }
      }

      // 3. 获取回复消息
      if (status === 'completed') {
        const listRes = await axios.get(
          `${baseUrl}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );

        const messages = listRes.data.data;
        const answerMsg = messages.find((msg: any) => msg.type === 'answer' && msg.role === 'assistant');

        return answerMsg ? answerMsg.content : '（AI 未返回有效分析）';
      }

      return '（AI 响应超时，PPT分析可能需要更长时间）';

    } catch (error: any) {
      this.logger.error(`调用 Coze PPT分析 API 失败: ${error?.response?.data?.msg || error?.message || error}`);
      return '（AI 服务暂时不可用）';
    }
  }

  /**
   * 通用 Agent 对话方法
   * @param botId Bot ID
   * @param message 用户消息
   * @param fileUrl 文件URL（可选）
   * @param fileName 文件名（可选）
   */
  async chatWithBot(botId: string, message: string, fileUrl?: string, fileName?: string): Promise<string> {
    const cozeToken = process.env.COZE_API_TOKEN;
    const baseUrl = process.env.COZE_BASE_URL || 'https://api.coze.cn';

    if (!cozeToken) {
      this.logger.error('❌ 未配置 COZE_API_TOKEN');
      return '（AI 服务配置缺失：缺少 API Token）';
    }

    if (!botId) {
      this.logger.error('❌ 未提供 Bot ID');
      return '（错误：缺少 Bot ID）';
    }

    try {
      // 构建消息内容
      let content = message;
      if (fileName) {
        content = `文件名: ${fileName}\n${message}`;
      }
      if (fileUrl) {
        content += `\n文件URL: ${fileUrl}`;
      }

      // 1. 发起对话
      this.logger.log(`调用 Coze Bot ${botId}...`);
      const createRes = await axios.post(
        `${baseUrl}/v3/chat`,
        {
          bot_id: botId,
          user_id: 'canvas_student_user',
          stream: false,
          auto_save_history: true,
          additional_messages: [
            {
              role: 'user',
              content: content,
              content_type: 'text',
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${cozeToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const chatId = createRes.data.data.id;
      const conversationId = createRes.data.data.conversation_id;

      // 2. 轮询等待 AI 思考完成
      let status = createRes.data.data.status;
      let retryCount = 0;
      const maxRetries = 60;

      while (status === 'in_progress' && retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const retrieveRes = await axios.get(
          `${baseUrl}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );
        
        status = retrieveRes.data.data.status;
        retryCount++;
        
        if (status === 'failed' || status === 'requires_action') {
          this.logger.error(`Bot 处理失败，状态: ${status}`);
          return '（AI 处理中断或失败）';
        }
      }

      // 3. 获取回复消息
      if (status === 'completed') {
        const listRes = await axios.get(
          `${baseUrl}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );

        const messages = listRes.data.data;
        const answerMsg = messages.find((msg: any) => msg.type === 'answer' && msg.role === 'assistant');

        if (answerMsg) {
          this.logger.log(`Bot 响应成功，内容长度: ${answerMsg.content?.length || 0}`);
          return answerMsg.content;
        } else {
          this.logger.warn('未找到 AI 回复消息');
          return '（AI 未返回有效回复）';
        }
      }

      this.logger.warn(`Bot 响应超时，最终状态: ${status}`);
      return '（AI 响应超时）';

    } catch (error: any) {
      this.logger.error(`调用 Coze Bot 失败: ${error?.response?.data?.msg || error?.message || error}`);
      if (error?.response?.data) {
        this.logger.error(`错误详情: ${JSON.stringify(error.response.data)}`);
      }
      return '（AI 服务暂时不可用）';
    }
  }

  /**
   * 分析上传的文件
   * @param fileBuffer 文件二进制数据
   * @param fileName 文件名
   * @param mimeType 文件MIME类型
   * @param botId Bot ID（可选）
   * @param customPrompt 自定义提示词（可选）
   */
  async analyzeFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    botId?: string,
    customPrompt?: string
  ): Promise<string> {
    const cozeToken = process.env.COZE_API_TOKEN;
    const defaultBotId = process.env.COZE_BOT_ID;
    const finalBotId = botId || defaultBotId;
    const baseUrl = process.env.COZE_BASE_URL || 'https://api.coze.cn';

    // 打印 token 的前后几位用于验证（不完整打印保证安全）
    if (cozeToken) {
      this.logger.debug(`COZE_API_TOKEN 已加载: ${cozeToken.substring(0, 10)}...${cozeToken.substring(cozeToken.length - 5)}`);
    }

    if (!cozeToken) {
      this.logger.error('❌ 未配置 COZE_API_TOKEN');
      return '（AI 服务配置缺失：缺少 API Token）';
    }

    if (!finalBotId) {
      this.logger.error('❌ 未提供 Bot ID 且环境变量未配置 COZE_BOT_ID');
      return '（AI 服务配置缺失：缺少 Bot ID）';
    }

    try {
      // 1. 上传文件到 Coze，获取 file_id
      let fileId: string | null = null;
      
      this.logger.log(`📤 开始上传文件到 Coze: ${fileName} (${this.formatBytes(fileBuffer.length)}, MIME: ${mimeType})`);
      
      try {
        const FormData = require('form-data');
        const formData = new FormData();
        
        // 🔑 严格按照 Coze API 文档规范：字段名必须是 'file'
        formData.append('file', fileBuffer, {
          filename: fileName,
          contentType: mimeType,
        });

        const uploadRes = await axios.post(
          `${baseUrl}/v1/files/upload`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${cozeToken}`,
            },
            timeout: 120000, // 120秒超时（大文件需要更长时间）
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }
        );

        // 🔑 Coze API 返回格式: { code: 0, data: { id: "file_id" } }
        if (uploadRes.data?.code === 0 && uploadRes.data?.data?.id) {
          fileId = uploadRes.data.data.id;
          this.logger.log(`✅ 文件上传成功，file_id: ${fileId}`);
        } else {
          this.logger.error(`❌ 文件上传失败，响应: ${JSON.stringify(uploadRes.data)}`);
          throw new Error('文件上传返回格式异常');
        }
      } catch (uploadError: any) {
        this.logger.error(`❌ 文件上传失败: ${uploadError?.response?.data?.msg || uploadError?.message}`);
        if (uploadError.response?.data) {
          this.logger.error(`详细错误: ${JSON.stringify(uploadError.response.data)}`);
        }
        throw new Error(`无法上传文件到 Coze: ${uploadError?.response?.data?.msg || uploadError?.message}`);
      }

      // 2. 构建提示词
      const defaultPrompt = customPrompt || this.getDefaultPromptForFileType(mimeType, fileName);
      
      // 3. 🔑 严格按照 Coze API 规范构建 object_string 消息
      // 文档要求：content_type 为 object_string 时，content 必须是 JSON 字符串数组
      const messageContent = {
        role: 'user',
        content: JSON.stringify([
          {
            type: 'text',
            text: defaultPrompt
          },
          {
            type: 'file',      // 🔑 文件类型统一使用 'file'
            file_id: fileId    // 🔑 使用上传后的 file_id
          }
        ]),
        content_type: 'object_string'  // 🔑 必须使用 object_string
      };

      this.logger.log(`📨 准备发送消息到 Coze Bot ${finalBotId}`);
      this.logger.debug(`消息内容: ${JSON.stringify(messageContent, null, 2)}`);

      // 4. 发起对话
      const createRes = await axios.post(
        `${baseUrl}/v3/chat`,
        {
          bot_id: finalBotId,
          user_id: 'canvas_student_user',
          stream: false,
          auto_save_history: true,
          additional_messages: [messageContent],
        },
        {
          headers: {
            Authorization: `Bearer ${cozeToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 180000, // 3分钟超时（文件分析需要更长时间）
        }
      );

      this.logger.debug(`Coze /v3/chat 响应: ${JSON.stringify(createRes.data)}`);

      // 检查 Coze API 错误
      if (createRes.data?.code !== 0) {
        const errorMsg = createRes.data?.msg || '未知错误';
        const errorCode = createRes.data?.code;
        this.logger.error(`❌ Coze API 返回错误 (${errorCode}): ${errorMsg}`);
        
        // 特殊错误码处理
        if (errorCode === 4015) {
          return `Bot 未发布到 API 频道。\n\n请在 Coze 平台执行以下操作：\n1. 打开 Bot 编辑页面\n2. 点击右上角「发布」按钮\n3. 选择「API」频道\n4. 完成发布后重试\n\n详情: ${errorMsg}`;
        }
        
        return `Coze API 错误 (${errorCode}): ${errorMsg}`;
      }

      const chatId = createRes.data?.data?.id;
      const conversationId = createRes.data?.data?.conversation_id;
      
      if (!chatId || !conversationId) {
        this.logger.error(`❌ 对话创建失败，响应: ${JSON.stringify(createRes.data)}`);
        return '对话创建失败，请检查 Bot ID 和 API Token';
      }
      
      this.logger.log(`对话创建成功，chat_id: ${chatId}, conversation_id: ${conversationId}`);

      // 5. 轮询等待 AI 完成
      let status = createRes.data.data.status;
      let retryCount = 0;
      const maxRetries = 90; // 文件分析最多等待 3 分钟（每次2秒）

      this.logger.log(`开始轮询，初始状态: ${status}`);

      while (status === 'in_progress' && retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const retrieveRes = await axios.get(
          `${baseUrl}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          }
        );
        
        status = retrieveRes.data.data.status;
        retryCount++;
        
        if (retryCount % 10 === 0) {
          this.logger.log(`轮询中... (${retryCount}/${maxRetries}), 当前状态: ${status}`);
        }
        
        if (status === 'failed' || status === 'requires_action') {
          this.logger.error(`Bot 处理失败，状态: ${status}`);
          throw new Error(`AI 处理失败: ${status}`);
        }
      }

      // 6. 获取回复消息
      if (status === 'completed') {
        this.logger.log('对话完成，正在获取消息...');
        const listRes = await axios.get(
          `${baseUrl}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          }
        );

        const messages = listRes.data.data;
        const answerMsg = messages.find((msg: any) => msg.type === 'answer' && msg.role === 'assistant');

        if (answerMsg) {
          this.logger.log(`✅ 获取到 AI 回复，长度: ${answerMsg.content?.length || 0} 字符`);
          return answerMsg.content;
        } else {
          this.logger.warn('⚠️ 未找到 AI 回复消息');
          throw new Error('AI 未返回有效分析');
        }
      }

      this.logger.warn(`⚠️ 对话超时，最终状态: ${status}`);
      throw new Error('AI 响应超时');

    } catch (error: any) {
      this.logger.error(`❌ Coze 文件分析失败: ${error?.response?.data?.msg || error?.message || error}`);
      if (error.response?.data) {
        this.logger.error(`错误详情: ${JSON.stringify(error.response.data)}`);
      }
      
      // 返回详细错误信息
      const errorMsg = error?.response?.data?.msg || error?.message || '未知错误';
      return `文件分析失败：${errorMsg}\n\n请检查：\n1. Coze API Token 是否有效\n2. Bot 是否支持文件分析\n3. 文件格式是否被支持`;
    }
  }

  /**
   * 根据文件类型生成默认提示词
   */
  private getDefaultPromptForFileType(mimeType: string, fileName: string): string {
    if (mimeType.includes('presentation') || fileName.match(/\.(ppt|pptx)$/i)) {
      return '请详细分析这个PPT课件，包括：\n1. 主要内容和章节结构\n2. 核心知识点和重点\n3. 难点解析\n4. 学习建议';
    } else if (mimeType.includes('document') || fileName.match(/\.(doc|docx)$/i)) {
      return '请详细分析这个Word文档，提取核心内容和要点。';
    } else if (mimeType === 'application/pdf') {
      return '请详细分析这个PDF文档，总结主要内容。';
    } else if (mimeType.includes('spreadsheet') || fileName.match(/\.(xls|xlsx)$/i)) {
      return '请分析这个Excel表格的数据和结构。';
    } else {
      return '请分析这个文件，给出详细的解读和总结。';
    }
  }

  /**
   * 生成课程总结（支持文本+多个文件一起发送）
   * @param text 大纲文本内容
   * @param files 要分析的文件列表
   * @param botId Bot ID（可选）
   */
  async generateSummaryWithFiles(
    text: string,
    files: Array<{ buffer: Buffer; fileName: string; contentType: string }>,
    botId?: string
  ): Promise<string> {
    const cozeToken = process.env.COZE_API_TOKEN;
    const defaultBotId = process.env.COZE_BOT_ID;
    const finalBotId = botId || defaultBotId;
    const baseUrl = process.env.COZE_BASE_URL || 'https://api.coze.cn';

    if (!cozeToken) {
      this.logger.error('❌ 未配置 COZE_API_TOKEN');
      return '（AI 服务配置缺失：缺少 API Token）';
    }

    if (!finalBotId) {
      this.logger.error('❌ 未提供 Bot ID 且环境变量未配置 COZE_BOT_ID');
      return '（AI 服务配置缺失：缺少 Bot ID）';
    }

    try {
      // 1. 上传所有文件到 Coze
      const fileIds: string[] = [];
      
      this.logger.log(`📤 开始上传 ${files.length} 个文件到 Coze...`);
      
      for (const file of files) {
        try {
          this.logger.log(`上传文件: ${file.fileName} (${this.formatBytes(file.buffer.length)})`);
          
          const FormData = require('form-data');
          const formData = new FormData();
          formData.append('file', file.buffer, {
            filename: file.fileName,
            contentType: file.contentType,
          });

          const uploadRes = await axios.post(
            `${baseUrl}/v1/files/upload`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${cozeToken}`,
              },
              timeout: 120000,
            }
          );

          const fileId = uploadRes.data?.data?.id;
          if (fileId) {
            fileIds.push(fileId);
            this.logger.log(`✅ 文件 ${file.fileName} 上传成功，file_id: ${fileId}`);
          } else {
            this.logger.warn(`⚠️  文件 ${file.fileName} 上传失败，响应: ${JSON.stringify(uploadRes.data)}`);
          }
        } catch (uploadError: any) {
          this.logger.error(`文件 ${file.fileName} 上传失败: ${uploadError?.message || uploadError}`);
        }
      }

      // 2. 构建 object_string 消息内容（文本 + 所有文件）
      const messageContent: any[] = [
        {
          type: 'text',
          text: `请总结以下课程内容，提取核心知识点和考核重点：\n\n${text}\n\n以下是课程大纲引用的教学文件，请一并分析：`
        }
      ];

      // 添加所有文件
      fileIds.forEach((fileId, index) => {
        messageContent.push({
          type: 'file',
          file_id: fileId
        });
      });

      const contentString = JSON.stringify(messageContent);
      
      this.logger.log(`📨 准备发送消息到 Coze Bot ${finalBotId}`);
      this.logger.log(`消息包含: ${text.length} 字符文本 + ${fileIds.length} 个文件`);

      // 3. 创建对话
      const createRes = await axios.post(
        `${baseUrl}/v3/chat`,
        {
          bot_id: finalBotId,
          user_id: 'canvas_student_user',
          stream: false,
          auto_save_history: true,
          additional_messages: [
            {
              role: 'user',
              content: contentString,
              content_type: 'object_string',
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${cozeToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 180000, // 3分钟超时
        },
      );

      const chatId = createRes.data.data.id;
      const conversationId = createRes.data.data.conversation_id;

      this.logger.log(`对话创建成功，chat_id: ${chatId}, conversation_id: ${conversationId}`);

      // 4. 轮询等待 AI 完成
      let status = createRes.data.data.status;
      let retryCount = 0;
      const maxRetries = 90; // 90秒超时

      this.logger.log(`开始轮询，初始状态: ${status}`);

      while (status === 'in_progress' && retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 每2秒检查一次
        
        const retrieveRes = await axios.get(
          `${baseUrl}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );
        
        status = retrieveRes.data.data.status;
        retryCount++;
        
        if (retryCount % 5 === 0) {
          this.logger.log(`轮询中... (${retryCount}/${maxRetries}), 当前状态: ${status}`);
        }
        
        if (status === 'failed' || status === 'requires_action') {
          this.logger.error(`对话失败，状态: ${status}`);
          return '（AI 处理中断或失败）';
        }
      }

      // 5. 获取回复
      if (status === 'completed') {
        this.logger.log('对话完成，正在获取消息...');
        
        const listRes = await axios.get(
          `${baseUrl}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            headers: { Authorization: `Bearer ${cozeToken}` },
          },
        );

        const messages = listRes.data.data;
        const answerMsg = messages.find((msg: any) => msg.type === 'answer' && msg.role === 'assistant');

        if (answerMsg) {
          this.logger.log(`✅ 获取到 AI 回复，长度: ${answerMsg.content.length} 字符`);
          return answerMsg.content;
        }
        
        return '（AI 未返回有效总结）';
      }

      this.logger.warn(`AI 响应超时，最终状态: ${status}`);
      return '（AI 响应超时，请稍后重试）';

    } catch (error: any) {
      this.logger.error(`调用 Coze API 失败: ${error?.response?.data?.msg || error?.message || error}`);
      return '（AI 服务暂时不可用）';
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
}