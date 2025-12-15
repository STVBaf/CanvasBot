import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Delete,
  Body, 
  Param, 
  Query
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GetToken } from '../auth/get-token.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * 创建小组
   * POST /api/groups
   */
  @Post()
  async createGroup(
    @Body() dto: CreateGroupDto,
    @GetToken() token: string
  ) {
    const group = await this.groupsService.createGroup(token, dto);

    return {
      success: true,
      message: '小组创建成功',
      group,
    };
  }

  /**
   * 获取所有课程的所有小组（全局公开列表）
   * GET /api/groups/all
   */
  @Get('all')
  async getAllGroups(@GetToken() token: string) {
    const groups = await this.groupsService.getAllGroups(token);

    return {
      groups,
      total: groups.length,
    };
  }

  /**
   * 获取用户加入的所有小组
   * GET /api/groups/my
   */
  @Get('my')
  async getMyGroups(
    @Query('courseId') courseId: string | undefined,
    @GetToken() token: string
  ) {
    const groups = await this.groupsService.getUserGroups(token, courseId);

    return {
      groups,
      total: groups.length,
    };
  }

  /**
   * 获取指定课程的所有小组
   * GET /api/groups/course/:courseId
   */
  @Get('course/:courseId')
  async getCourseGroups(
    @Param('courseId') courseId: string,
    @GetToken() token: string
  ) {
    const groups = await this.groupsService.getCourseGroups(token, courseId);

    return {
      courseId,
      groups,
      total: groups.length,
    };
  }

  /**
   * 获取小组详情
   * GET /api/groups/:groupId
   */
  @Get(':groupId')
  async getGroupDetail(
    @Param('groupId') groupId: string,
    @GetToken() token: string
  ) {
    const group = await this.groupsService.getGroupDetail(token, groupId);

    return group;
  }

  /**
   * 加入小组
   * POST /api/groups/:groupId/join
   */
  @Post(':groupId/join')
  async joinGroup(
    @Param('groupId') groupId: string,
    @GetToken() token: string
  ) {
    return await this.groupsService.joinGroup(token, groupId);
  }

  /**
   * 退出小组
   * POST /api/groups/:groupId/leave
   */
  @Post(':groupId/leave')
  async leaveGroup(
    @Param('groupId') groupId: string,
    @GetToken() token: string
  ) {
    return await this.groupsService.leaveGroup(token, groupId);
  }

  /**
   * 更新小组信息
   * PUT /api/groups/:groupId
   */
  @Put(':groupId')
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
    @GetToken() token: string
  ) {
    return await this.groupsService.updateGroup(token, groupId, dto);
  }

  /**
   * 删除小组
   * DELETE /api/groups/:groupId
   */
  @Delete(':groupId')
  async deleteGroup(
    @Param('groupId') groupId: string,
    @GetToken() token: string
  ) {
    return await this.groupsService.deleteGroup(token, groupId);
  }

  /**
   * 移除小组成员
   * DELETE /api/groups/:groupId/members/:memberId
   */
  @Delete(':groupId/members/:memberId')
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @GetToken() token: string
  ) {
    return await this.groupsService.removeMember(token, groupId, memberId);
  }
}
