import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { GetToken } from '../auth/get-token.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前登录用户信息
   * GET /api/user/me
   */
  @Get('me')
  async getCurrentUser(@GetToken() token: string) {
    const user = await this.userService.getUserByToken(token);
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      canvasId: user.canvasId,
      createdAt: user.createdAt,
    };
  }
}
