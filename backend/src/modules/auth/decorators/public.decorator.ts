import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public — bypasses JwtAuthGuard.
 * Use on health checks, login, register, etc.
 *
 * @example
 * @Public()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
