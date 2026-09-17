import type { UserResponse } from '@finance/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { toUserResponse, UsersService } from '../users/users.service';
import type { AccessTokenPayload } from './jwt-auth.guard';
import { DUMMY_PASSWORD_HASH, verifyPassword } from './password';
import { type ClientInfo, type IssuedRefreshToken, SessionsService } from './sessions.service';

export interface LoginResult extends IssuedRefreshToken {
  accessToken: string;
  user: UserResponse;
}

export interface RefreshResult extends IssuedRefreshToken {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, client: ClientInfo): Promise<LoginResult> {
    const user = await this.usersService.findByEmailWithPasswordHash(email);

    // Always run exactly one argon2 check, even for an unknown email, so both failures
    // take the same time and share one message: nobody can probe which emails exist.
    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );
    if (!user || !passwordMatches) {
      throw new AppError(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const issued = await this.sessionsService.start(user._id, client);
    return {
      ...issued,
      accessToken: await this.signAccessToken(user._id),
      user: toUserResponse(user),
    };
  }

  async refresh(refreshToken: string, client: ClientInfo): Promise<RefreshResult> {
    const rotated = await this.sessionsService.rotate(refreshToken, client);
    return {
      refreshToken: rotated.refreshToken,
      expiresAt: rotated.expiresAt,
      accessToken: await this.signAccessToken(rotated.userId),
    };
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessionsService.end(refreshToken);
  }

  async me(userId: string): Promise<UserResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      // The token was valid but its user has since been deleted.
      throw new AppError('AUTH_TOKEN_INVALID', 'User no longer exists', HttpStatus.UNAUTHORIZED);
    }
    return toUserResponse(user);
  }

  private signAccessToken(userId: Types.ObjectId): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId.toString() };
    return this.jwtService.signAsync(payload);
  }
}
