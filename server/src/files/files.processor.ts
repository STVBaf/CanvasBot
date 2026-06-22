import { ConfigService } from '@nestjs/config';
import { QueueEvents, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CanvasService } from '../canvas/canvas.service';
import axios from 'axios';
import { createWriteStream, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class FilesProcessor implements OnModuleInit {
  private readonly logger = new Logger(FilesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly canvas: CanvasService,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>('FILE_WORKER_ENABLED') === 'false') {
      this.logger.warn('File download worker is disabled by FILE_WORKER_ENABLED=false');
      return;
    }

    const connectionOptions = {
      url: this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
    };

    new Worker(
      'file-download',
      async job => {
        if (job.name !== 'download') return;

        const fileMeta = await this.findFileMeta(job.data);
        if (!fileMeta) return;

        try {
          await this.prisma.fileMeta.update({
            where: { id: fileMeta.id },
            data: { status: 'downloading' },
          });

          const userId = job.data.userId ?? fileMeta.userId;
          const canvasFileId = job.data.canvasFileId ?? fileMeta.canvasFileId;
          const accessToken = await this.canvas.getAccessTokenForUser(userId);
          const fileInfo = await this.canvas.getFileInfo(accessToken, canvasFileId);
          const downloadUrl = fileInfo.url || fileMeta.downloadUrl;
          const fileName = fileInfo.display_name || fileInfo.filename || fileMeta.fileName;
          const contentType = fileInfo['content-type'] || fileInfo.content_type || fileMeta.contentType;
          const maxBytes = this.getMaxDownloadBytes();
          const expectedSize = Number(fileInfo.size ?? fileMeta.fileSize);
          if (Number.isFinite(expectedSize) && expectedSize > maxBytes) {
            throw new Error(`Canvas file ${canvasFileId} exceeds download limit (${expectedSize} > ${maxBytes})`);
          }
          if (!downloadUrl) {
            throw new Error(`Canvas file ${canvasFileId} has no download URL`);
          }

          const res = await axios.get(downloadUrl, {
            headers: { Authorization: `Bearer ${accessToken.trim()}` },
            responseType: 'stream',
            timeout: 120000,
            maxBodyLength: 100 * 1024 * 1024,
          });

          const contentLength = Number(res.headers['content-length']);
          if (Number.isFinite(contentLength) && contentLength > maxBytes) {
            throw new Error(`Canvas file ${canvasFileId} response exceeds download limit (${contentLength} > ${maxBytes})`);
          }

          const dir = this.config.get<string>('FILE_STORAGE_DIR') ?? './files';
          mkdirSync(dir, { recursive: true });
          
          // 使用原始文件名而不是 .bin
          // 从 fileName 提取扩展名，如果没有则从 URL 或 contentType 推断
          const ext = extname(fileName) || this.guessExtension(contentType);
          let sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
          if (!extname(sanitizedName) && ext) {
            sanitizedName += ext;
          }
          const path = join(dir, `${fileMeta.id}_${sanitizedName}`);

          await pipeline(res.data, this.createByteLimitStream(maxBytes), createWriteStream(path));

          const fileSize = Number.isFinite(contentLength) && contentLength > 0
            ? contentLength
            : fileInfo.size ?? fileMeta.fileSize;

          await this.prisma.fileMeta.update({
            where: { id: fileMeta.id },
            data: { 
              fileName,
              downloadUrl,
              contentType,
              localPath: path, 
              status: 'downloaded',
              fileSize,
            },
          });
          
          this.logger.log(`File downloaded successfully: ${fileName}`);
        } catch (error) {
          this.logger.error(`Failed to download file ${fileMeta.fileName}: ${error}`);
          await this.prisma.fileMeta.update({
            where: { id: fileMeta.id },
            data: { status: 'failed' },
          });
          throw error;
        }
      },
      { connection: connectionOptions, concurrency: 2 },
    );

    const events = new QueueEvents('file-download', { connection: connectionOptions });
    events.on('failed', async ({ jobId, failedReason }) => {
      console.error('job failed', jobId, failedReason);
    });
  }

  /**
   * 根据 content type 推断文件扩展名
   */
  private async findFileMeta(jobData: any) {
    if (jobData.userId && jobData.canvasFileId) {
      return this.prisma.fileMeta.findUnique({
        where: {
          userId_canvasFileId: {
            userId: jobData.userId,
            canvasFileId: jobData.canvasFileId,
          },
        },
      });
    }

    if (jobData.fileMetaId) {
      return this.prisma.fileMeta.findUnique({
        where: { id: jobData.fileMetaId },
      });
    }

    return null;
  }

  private getMaxDownloadBytes(): number {
    const configured = Number(this.config.get<string>('FILE_DOWNLOAD_MAX_BYTES'));
    return Number.isFinite(configured) && configured > 0
      ? configured
      : 100 * 1024 * 1024;
  }

  private createByteLimitStream(maxBytes: number): Transform {
    let total = 0;
    return new Transform({
      transform(chunk, _encoding, callback) {
        total += Buffer.byteLength(chunk);
        if (total > maxBytes) {
          callback(new Error(`Download exceeded ${maxBytes} bytes`));
          return;
        }
        callback(null, chunk);
      },
    });
  }

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
