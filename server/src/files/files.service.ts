import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanvasService } from '../canvas/canvas.service';
import { Queue } from 'bullmq';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canvas: CanvasService,
    @Inject('FILE_QUEUE') private readonly fileQueue: Queue,
  ) {}

  async syncCourseFiles(userId: string, courseId: string) {
    const accessToken = await this.canvas.getAccessTokenForUser(userId);
    await this.performSync(userId, accessToken, courseId);
  }

  async syncCourseFilesByToken(accessToken: string, courseId: string) {
    // 1. Get user info from Canvas to ensure we have a user record
    const profile = await this.canvas.getUserProfile(accessToken);
    const canvasId = profile.id ? String(profile.id) : null;
    
    if (!canvasId) {
      throw new Error('无法获取 Canvas 用户 ID');
    }
    
    // 2. Find or create user by canvasId, falling back to email for old rows.
    const email = profile.primary_email || profile.login_id || `canvas_user_${canvasId}@example.com`;
    let user = await this.prisma.user.findUnique({ where: { canvasId } });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.name ?? null,
          canvasId,
          avatar: profile.avatar_url ?? null,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.name ?? user.name,
          avatar: profile.avatar_url ?? user.avatar,
          canvasId: user.canvasId ?? canvasId,
        },
      });
    }

    await this.storeCanvasToken(user.id, canvasId, accessToken);

    // 3. Sync
    await this.performSync(user.id, accessToken, courseId);
  }

  private async storeCanvasToken(userId: string, canvasId: string, accessToken: string) {
    const existingToken = await this.prisma.token.findFirst({
      where: { userId, provider: 'canvas' },
    });

    if (existingToken) {
      await this.prisma.token.update({
        where: { id: existingToken.id },
        data: {
          accessToken,
          providerUserId: canvasId,
          expiresAt: null,
          refreshToken: null,
        },
      });
      return;
    }

    await this.prisma.token.create({
      data: {
        userId,
        provider: 'canvas',
        providerUserId: canvasId,
        accessToken,
        expiresAt: null,
        refreshToken: null,
      },
    });
  }

  private async performSync(userId: string, accessToken: string, courseId: string) {
    const files = await this.canvas.getCourseFiles(accessToken, courseId);

    for (const f of files) {
      const canvasFileId = String(f.id);
      await this.prisma.fileMeta.upsert({
        where: {
          userId_canvasFileId: {
            userId,
            canvasFileId,
          },
        },
        update: {
          fileName: f.display_name ?? f.filename,
          downloadUrl: f.url,
          courseId: String(courseId),
          fileSize: f.size ?? null,
          contentType: f.content_type ?? null,
        },
        create: {
          userId,
          courseId: String(courseId),
          canvasFileId,
          fileName: f.display_name ?? f.filename,
          downloadUrl: f.url,
          fileSize: f.size ?? null,
          contentType: f.content_type ?? null,
        },
      });

      await this.fileQueue.add('download', {
        userId,
        canvasFileId,
      }, {
        jobId: `file-download:${userId}:${canvasFileId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      });
    }
  }

  /**
   * 获取指定课程的文件列表（直接从 Canvas 获取，不存数据库）
   */
  async getCourseFilesFromCanvas(accessToken: string, courseId: string) {
    const files = await this.canvas.getCourseFiles(accessToken, courseId);
    
    // 格式化返回数据
    return files.map((file: any) => ({
      id: file.id,
      displayName: file.display_name || file.filename,  // 优先使用 display_name
      fileName: file.display_name || file.filename,      // 优先使用 display_name，去除数字前缀
      size: file.size || 0,                            // 确保 size 字段正确
      contentType: file['content-type'] || file.content_type,
      url: file.url,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      modifiedAt: file.modified_at,
      locked: file.locked || false,
      hidden: file.hidden || false,
      thumbnailUrl: file.thumbnail_url,
    }));
  }

  /**
   * 下载单个文件
   */
  async downloadSingleFile(accessToken: string, fileId: string) {
    // 1. 获取文件信息
    const fileInfo = await this.canvas.getFileInfo(accessToken, fileId);
    
    // 2. 下载文件内容
    const fileBuffer = await this.canvas.downloadFile(accessToken, fileInfo.url);
    
    return {
      buffer: fileBuffer,
      fileName: fileInfo.display_name || fileInfo.filename,
      contentType: fileInfo['content-type'] || fileInfo.content_type,
      size: fileInfo.size,
    };
  }

  /**
   * 获取指定课程的文件列表（从数据库获取已同步的文件）
   */
  async getCourseFiles(accessToken: string, courseId: string) {
    // 1. 获取用户信息
    const profile = await this.canvas.getUserProfile(accessToken);
    const canvasId = profile.id ? String(profile.id) : null;
    
    if (!canvasId) {
      return [];
    }
    
    const user = await this.prisma.user.findUnique({ where: { canvasId } });
    if (!user) {
      return [];
    }

    // 2. 查询该课程的文件
    const files = await this.prisma.fileMeta.findMany({
      where: {
        userId: user.id,
        courseId: String(courseId),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        canvasFileId: true,
        fileName: true,
        fileSize: true,
        contentType: true,
        downloadUrl: true,
        localPath: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return files;
  }

  /**
   * 获取文件详情
   */
  async getFileDetail(fileId: string, accessToken: string) {
    // 验证用户
    const profile = await this.canvas.getUserProfile(accessToken);
    const canvasId = profile.id ? String(profile.id) : null;
    
    if (!canvasId) {
      return null;
    }
    
    const user = await this.prisma.user.findUnique({ where: { canvasId } });
    if (!user) {
      return null;
    }

    const file = await this.prisma.fileMeta.findFirst({
      where: {
        id: fileId,
        userId: user.id,
      },
    });

    return file;
  }
}
