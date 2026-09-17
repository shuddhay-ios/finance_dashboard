import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
}

// Express's own extension point: every Express Request type includes this global interface.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express only exposes a namespace to extend
  namespace Express {
    interface Request {
      /** Set by JwtAuthGuard once the access token has been verified. */
      user?: AuthenticatedUser;
    }
  }
}

/** Injects the logged-in user into a controller method: `me(@CurrentUser() user)`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      // Only possible if a @Public() route uses this decorator: a programming mistake.
      throw new Error('@CurrentUser() used on a route that is not authenticated');
    }
    return request.user;
  },
);
