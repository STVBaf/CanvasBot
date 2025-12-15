import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CanvasService } from '../canvas/canvas.service';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canvas: CanvasService,
  ) {}

  /**
   * 获取用户信息
   */
  private async getUserByToken(accessToken: string) {
    const profile = await this.canvas.getUserProfile(accessToken);
    const canvasId = profile.id ? String(profile.id) : null;
    
    if (!canvasId) {
      throw new Error('无法获取 Canvas 用户 ID');
    }
    
    // 优先通过 canvasId 查找用户
    let user = await this.prisma.user.findFirst({ 
      where: { canvasId } 
    });
    
    if (!user) {
      // 如果找不到，创建新用户
      const email = profile.primary_email || profile.login_id || `canvas_user_${canvasId}@example.com`;
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.name ?? null,
          canvasId,
          avatar: profile.avatar_url ?? null,
        },
      });
    } else if (!user.avatar && profile.avatar_url) {
      // 如果用户存在但缺少头像，更新头像
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: profile.avatar_url,
          name: user.name || profile.name || null,
        },
      });
    }
    
    return user;
  }

  /**
   * 创建小组
   */
  async createGroup(
    accessToken: string,
    data: {
      courseId: string;
      courseName?: string;
      name: string;
      description?: string;
    }
  ) {
    const user = await this.getUserByToken(accessToken);

    // 创建小组
    const group = await this.prisma.group.create({
      data: {
        courseId: data.courseId,
        courseName: data.courseName,
        name: data.name,
        description: data.description,
        creatorId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'creator',
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          }
        }
      }
    });

    return group;
  }

  /**
   * 获取用户加入的所有小组
   */
  async getUserGroups(accessToken: string, courseId?: string) {
    const user = await this.getUserByToken(accessToken);

    const where: any = {
      members: {
        some: {
          userId: user.id,
        }
      }
    };

    if (courseId) {
      where.courseId = courseId;
    }

    const groups = await this.prisma.group.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return groups.map(group => ({
      id: group.id,
      courseId: group.courseId,
      courseName: group.courseName,
      name: group.name,
      description: group.description,
      creator: group.creator,
      isCreator: group.creatorId === user.id,
      isActive: group.isActive,
      memberCount: group._count.members,
      members: group.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  /**
   * 获取所有课程的所有小组（全局公开列表）
   */
  async getAllGroups(accessToken: string) {
    const user = await this.getUserByToken(accessToken); // 验证用户登录

    const groups = await this.prisma.group.findMany({
      where: {
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return groups.map(group => ({
      id: group.id,
      courseId: group.courseId,
      courseName: group.courseName,
      name: group.name,
      description: group.description,
      creator: group.creator,
      isCreator: group.creatorId === user.id,
      isMember: group.members.some(m => m.userId === user.id),
      isActive: group.isActive,
      memberCount: group._count.members,
      members: group.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  /**
   * 获取指定课程的所有小组（公开列表）
   */
  async getCourseGroups(accessToken: string, courseId: string) {
    await this.getUserByToken(accessToken); // 验证用户登录

    const groups = await this.prisma.group.findMany({
      where: {
        courseId,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    return groups.map(group => ({
      id: group.id,
      courseId: group.courseId,
      courseName: group.courseName,
      name: group.name,
      description: group.description,
      creator: group.creator,
      isActive: group.isActive,
      memberCount: group._count.members,
      members: group.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      createdAt: group.createdAt,
    }));
  }

  /**
   * 获取小组详情
   */
  async getGroupDetail(accessToken: string, groupId: string) {
    const user = await this.getUserByToken(accessToken);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          },
          orderBy: {
            joinedAt: 'asc',
          }
        }
      }
    });

    if (!group) {
      throw new NotFoundException('小组不存在');
    }

    const isMember = group.members.some(m => m.userId === user.id);

    return {
      id: group.id,
      courseId: group.courseId,
      courseName: group.courseName,
      name: group.name,
      description: group.description,
      creator: group.creator,
      isCreator: group.creatorId === user.id,
      isMember,
      isActive: group.isActive,
      memberCount: group.members.length,
      members: group.members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  /**
   * 加入小组
   */
  async joinGroup(accessToken: string, groupId: string) {
    const user = await this.getUserByToken(accessToken);

    // 检查小组是否存在且活跃
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('小组不存在');
    }

    if (!group.isActive) {
      throw new BadRequestException('该小组已关闭，无法加入');
    }

    // 检查是否已经是成员
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        }
      }
    });

    if (existingMember) {
      throw new BadRequestException('您已经是该小组成员');
    }

    // 加入小组
    const member = await this.prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id,
        role: 'member',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        }
      }
    });

    return {
      success: true,
      message: '成功加入小组',
      member: {
        id: member.id,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user,
      }
    };
  }

  /**
   * 退出小组
   */
  async leaveGroup(accessToken: string, groupId: string) {
    const user = await this.getUserByToken(accessToken);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('小组不存在');
    }

    // 创建者不能退出自己的小组
    if (group.creatorId === user.id) {
      throw new ForbiddenException('创建者不能退出自己的小组，请先转让小组或解散小组');
    }

    // 删除成员关系
    const deleted = await this.prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId: user.id,
      }
    });

    if (deleted.count === 0) {
      throw new BadRequestException('您不是该小组成员');
    }

    return {
      success: true,
      message: '成功退出小组',
    };
  }

  /**
   * 删除小组（仅创建者）
   */
  async deleteGroup(accessToken: string, groupId: string) {
    const user = await this.getUserByToken(accessToken);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('小组不存在');
    }

    if (group.creatorId !== user.id) {
      throw new ForbiddenException('只有创建者可以删除小组');
    }

    // 删除小组（会级联删除成员）
    await this.prisma.group.delete({
      where: { id: groupId },
    });

    return {
      success: true,
      message: '小组已删除',
    };
  }

  /**
   * 更新小组信息（仅创建者）
   */
  async updateGroup(
    accessToken: string,
    groupId: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const user = await this.getUserByToken(accessToken);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('小组不存在');
    }

    if (group.creatorId !== user.id) {
      throw new ForbiddenException('只有创建者可以修改小组信息');
    }

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: data.name ?? group.name,
        description: data.description !== undefined ? data.description : group.description,
        isActive: data.isActive !== undefined ? data.isActive : group.isActive,
      },
      include: {
        _count: {
          select: {
            members: true,
          }
        }
      }
    });

    return {
      success: true,
      message: '小组信息已更新',
      group: {
        id: updated.id,
        courseId: updated.courseId,
        courseName: updated.courseName,
        name: updated.name,
        description: updated.description,
        isActive: updated.isActive,
        memberCount: updated._count.members,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      }
    };
  }

  /**
   * 移除成员（仅创建者）
   */
  async removeMember(accessToken: string, groupId: string, memberId: string) {
    const user = await this.getUserByToken(accessToken);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('小组不存在');
    }

    if (group.creatorId !== user.id) {
      throw new ForbiddenException('只有创建者可以移除成员');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.groupId !== groupId) {
      throw new NotFoundException('成员不存在');
    }

    if (member.role === 'creator') {
      throw new BadRequestException('不能移除创建者');
    }

    await this.prisma.groupMember.delete({
      where: { id: memberId },
    });

    return {
      success: true,
      message: '成员已移除',
    };
  }
}
