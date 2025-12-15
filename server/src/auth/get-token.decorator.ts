import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * 自定义装饰器：从请求头中提取 Bearer Token
 * 使用示例：
 * @Get('me')
 * async getCurrentUser(@GetToken() token: string) {
 *   // token 已经从 Authorization header 中提取
 * }
 */
export const GetToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: '缺少认证令牌，请先登录',
        error: 'Unauthorized'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Token 格式无效',
        error: 'Unauthorized'
      });
    }

    return token;
  },
);
