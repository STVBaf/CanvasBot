import { Controller, Get, Query, Post, Body, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
  ) {}

  // ========================================
  // OAuth2 路由（暂时注释，等获得 Developer Key 后启用）
  // ========================================
  /*
  @Get('login')
  login(@Res() res: Response) {
    const state = randomBytes(8).toString('hex');
    const url = this.auth.getAuthorizeUrl(state);
    return res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(`/callback?status=error&reason=${encodeURIComponent(error)}`);
    }

    const result = await this.auth.handleCallback(code);
    const redirectUrl = `/callback?status=success&token=${encodeURIComponent(result.jwt)}`;
    return res.redirect(redirectUrl);
  }
  */

  // ========================================
  // 手动 Token 登录（当前使用方式）
  // ========================================
  @Post('login/manual')
  async loginWithManualToken(
    @Body('accessToken') accessToken: string,
    @Body('email') email?: string,
  ) {
    if (!accessToken) {
      return { error: 'accessToken is required' };
    }
    return this.auth.loginWithManualToken(accessToken, email);
  }

  @Get('test-token')
  async testToken(@Query('email') email?: string, @Query('userId') userId?: string) {
    this.assertDevelopmentRoute();
    // For development: generate JWT token for existing user
    // Usage: /api/auth/test-token?email=user@example.com
    //    or: /api/auth/test-token?userId=user-id
    // If no params provided, create a default test user
    return this.auth.getTestToken(email, userId);
  }

  @Get('dev/users')
  async devListUsers() {
    this.assertDevelopmentRoute();
    // Development only: List all users to find email for testing
    return this.auth.listAllUsers();
  }

  @Get('dev/create-test-user')
  async devCreateTestUser() {
    this.assertDevelopmentRoute();
    // Development only: Create a test user for testing
    return this.auth.createTestUser();
  }

  private assertDevelopmentRoute() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
  }
}
