import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppError } from '../common/errors/app-error';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AccessTokenPayload {
  sub: string;
}

function tokenInvalid(message: string): AppError {
  return new AppError('AUTH_TOKEN_INVALID', message, HttpStatus.UNAUTHORIZED);
}

/** Registered globally: every route requires a valid access token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = readBearerToken(request);
    if (!token) {
      throw tokenInvalid('Missing bearer token');
    }

    request.user = { id: await this.verify(token) };
    return true;
  }

  private async verify(token: string): Promise<string> {
    let payload: Partial<AccessTokenPayload>;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch (error) {
      // Expired is told apart from invalid because the web app reacts differently:
      // expired means "refresh quietly and retry", invalid means "log in again".
      if (error instanceof TokenExpiredError) {
        throw new AppError('AUTH_TOKEN_EXPIRED', 'Access token expired', HttpStatus.UNAUTHORIZED);
      }
      throw tokenInvalid('Access token is invalid');
    }

    if (typeof payload.sub !== 'string') {
      throw tokenInvalid('Access token is invalid');
    }
    return payload.sub;
  }
}

function readBearerToken(request: Request): string | null {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme === 'Bearer' && token ? token : null;
}
