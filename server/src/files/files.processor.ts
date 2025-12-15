import { ConfigService } from '@nestjs/config';
import { QueueEvents, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { createWriteStream, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class FilesProcessor implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const connectionOptions = {
      url: this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
    };

    const worker = new Worker(
      'file-download',
      async job => {
        if (job.name !== 'download') return;

        const fileMeta = await this.prisma.fileMeta.findUnique({
          where: { id: job.data.fileMetaId },
        });
        if (!fileMeta) return;

        try {
          // 下载文件（使用 arraybuffer 而不是 stream）
          const res = await axios.get(fileMeta.downloadUrl, { 
            responseType: 'arraybuffer',
            maxContentLength: 100 * 1024 * 1024, // 100MB 限制
          });

          const dir = this.config.get<string>('FILE_STORAGE_DIR') ?? './files';
          mkdirSync(dir, { recursive: true });
          
          // 使用原始文件名而不是 .bin
          // 从 fileName 提取扩展名，如果没有则从 URL 或 contentType 推断
          const ext = extname(fileMeta.fileName) || this.guessExtension(fileMeta.contentType);
          const sanitizedName = fileMeta.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = join(dir, `${fileMeta.id}_${sanitizedName}`);
          
          // 直接写入 buffer
          const writer = createWriteStream(path);
          writer.write(Buffer.from(res.data));
          writer.end();

          await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', err => reject(err));
          });

          await this.prisma.fileMeta.update({
            where: { id: fileMeta.id },
            data: { 
              localPath: path, 
              status: 'downloaded',
              fileSize: res.data.byteLength,
            },
          });
          
          console.log(`File downloaded successfully: ${fileMeta.fileName}`);
        } catch (error) {
          console.error(`Failed to download file ${fileMeta.fileName}:`, error);
          await this.prisma.fileMeta.update({
            where: { id: fileMeta.id },
            data: { status: 'failed' },
          });
        }
      },
      { connection: connectionOptions },
    );

    const events = new QueueEvents('file-download', { connection: connectionOptions });
    events.on('failed', async ({ jobId, failedReason }) => {
      console.error('job failed', jobId, failedReason);
    });
  }

  /**
   * 根据 content type 推断文件扩展名
   */
  private guessExtension(contentType?: string | null): string {
    if (!contentType) return '';
    
    const mimeMap: Record<string, string> = {
      // 文档
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/rtf': '.rtf',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'text/html': '.html',
      'application/json': '.json',
      'application/xml': '.xml',
      'text/xml': '.xml',
      'text/csv': '.csv',
      
      // 表格
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.oasis.opendocument.spreadsheet': '.ods',
      
      // 演示文稿
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.oasis.opendocument.presentation': '.odp',
      
      // 图片
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      
      // 压缩文件
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
      'application/gzip': '.gz',
      'application/x-tar': '.tar',
      
      // 视频
      'video/mp4': '.mp4',
      'video/mpeg': '.mpeg',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      
      // 音频
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/aac': '.aac',
    };
    
    return mimeMap[contentType] || '';
  }
}
