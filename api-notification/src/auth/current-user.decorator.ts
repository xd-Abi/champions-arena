import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator zum einfachen Zugriff auf die User ID aus dem JWT Token
 * 
 * @example
 * @Get()
 * @UseGuards(JwtAuthGuard)
 * getNotifications(@CurrentUser() userId: string) {
 *   return this.notificationService.getNotifications(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.sub as string;
  },
);
