import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanvasService } from '../canvas/canvas.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canvas: CanvasService,
  ) {}

  /**
   * 通过 Canvas Token 获取当前用户信息
   */
  async getUserByToken(accessToken: string) {
    // 1. 从 Canvas 获取用户信息
    const profile = await this.canvas.getUserProfile(accessToken);
    
    if (!profile || !profile.id) {
      throw new UnauthorizedException('无法获取用户信息');
    }

    const canvasId = String(profile.id);

    // 2. 优先通过 canvasId 查找用户
    let user = await this.prisma.user.findFirst({ 
      where: { canvasId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        canvasId: true,
        createdAt: true,
      }
    });

    if (!user) {
      // 创建新用户
      const email = profile.primary_email || profile.login_id || `canvas_user_${canvasId}@example.com`;
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.name ?? null,
          canvasId,
          avatar: profile.avatar_url ?? null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          canvasId: true,
          createdAt: true,
        }
      });
    } else if (!user.canvasId || !user.avatar) {
      // 更新用户信息（如果缺少 canvasId 或头像）
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          canvasId: user.canvasId || (profile.id ? String(profile.id) : null),
          avatar: user.avatar || profile.avatar_url || null,
          name: user.name || profile.name || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          canvasId: true,
          createdAt: true,
        }
      });
    }

    return user;
  }
}
