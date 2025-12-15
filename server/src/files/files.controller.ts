import { Controller, Post, Get, Query, Param, BadRequestException, NotFoundException, Response } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { FilesService } from './files.service';
import { GetToken } from '../auth/get-token.decorator';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * 同步课程文件
   * POST /api/files/sync?courseId=<COURSE_ID>
   */
  @Post('sync')
  // @UseGuards(JwtAuthGuard)
  async sync(
    @Query('courseId') courseId: string,
    @GetToken() token: string
  ) {
    if (!courseId) {
      throw new BadRequestException({
        statusCode: 400,
        message: '缺少课程 ID',
        error: 'Bad Request'
      });
    }

    await this.filesService.syncCourseFilesByToken(token, courseId);

    return { 
      status: 'accepted',
      message: '文件同步任务已提交，后台正在处理中',
      courseId 
    };
  }

  /**
   * 获取课程文件列表（直接从 Canvas 获取，不需要同步）
   * GET /api/files/course/:courseId/live
   */
  @Get('course/:courseId/live')
  async getCourseFilesFromCanvas(
    @Param('courseId') courseId: string,
    @GetToken() token: string
  ) {
    const files = await this.filesService.getCourseFilesFromCanvas(token, courseId);
    
    return {
      courseId,
      files,
      total: files.length,
    };
  }

  /**
   * 下载单个文件
   * GET /api/files/download/:fileId
   */
  @Get('download/:fileId')
  async downloadFile(
    @Param('fileId') fileId: string,
    @GetToken() token: string,
    @Response() res: ExpressResponse
  ) {
    const file = await this.filesService.downloadSingleFile(token, fileId);
    
    // 设置响应头
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Content-Length', file.size);
    
    // 发送文件内容
    res.send(file.buffer);
  }

  /**
   * 获取指定课程的文件列表（从数据库获取已同步的文件）
   * GET /api/files/course/:courseId
   */
  @Get('course/:courseId')
  async getCourseFiles(
    @Param('courseId') courseId: string,
    @GetToken() token: string
  ) {
    const files = await this.filesService.getCourseFiles(token, courseId);
    
    return {
      courseId,
      files,
      total: files.length,
    };
  }

  /**
   * 获取文件详情（通配符路由，必须放在最后）
   * GET /api/files/:fileId
   */
  @Get(':fileId')
  async getFileDetail(
    @Param('fileId') fileId: string,
    @GetToken() token: string
  ) {
    const file = await this.filesService.getFileDetail(fileId, token);
    
    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    return file;
  }
}
