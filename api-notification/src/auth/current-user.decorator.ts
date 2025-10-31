import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator zum einfachen Zugriff auf die User ID aus dem Request
 * 
 * @example
 * @Get('my-notifications')
 * getNotifications(@CurrentUser() userId: string) {
 *   return this.notificationService.getNotifications(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.userId;
  },
);
