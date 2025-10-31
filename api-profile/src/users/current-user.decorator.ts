import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUserId = createParamDecorator((_d, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user?.sub as string;
});
