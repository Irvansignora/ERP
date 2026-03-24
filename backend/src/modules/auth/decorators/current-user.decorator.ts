import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * Extracts the authenticated user from the request.
 *
 * @example
 * async create(@CurrentUser() user: AuthUser, @Body() dto: CreateDto) {
 *   return this.service.create(dto, user.id);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
