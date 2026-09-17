import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import type { Model, Types } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { generateOpaqueToken, hashOpaqueToken } from '../common/opaque-token';
import { type RevokeReason, SESSION_MODEL, type Session } from './session.schema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ClientInfo {
  userAgent: string | null;
  ip: string | null;
}

export interface IssuedRefreshToken {
  refreshToken: string;
  expiresAt: Date;
}

export interface RotatedSession extends IssuedRefreshToken {
  userId: Types.ObjectId;
}

function invalidRefreshToken(): AppError {
  return new AppError(
    'AUTH_TOKEN_INVALID',
    'Refresh token is invalid or expired',
    HttpStatus.UNAUTHORIZED,
  );
}

function refreshTokenReused(): AppError {
  return new AppError(
    'AUTH_REFRESH_REUSED',
    'Refresh token was already used; the session has been ended',
    HttpStatus.UNAUTHORIZED,
  );
}

/**
 * Refresh tokens with rotation and reuse detection.
 * Rotation: every refresh token works exactly once and is swapped for a new one.
 * Reuse detection: if an already-swapped token comes back, someone copied it, so the
 * whole login (every token in its family) is ended.
 */
@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(SESSION_MODEL) private readonly sessionModel: Model<Session>,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Called on login: starts a new token family. */
  start(userId: Types.ObjectId, client: ClientInfo): Promise<IssuedRefreshToken> {
    return this.issue(userId, randomUUID(), client);
  }

  async rotate(refreshToken: string, client: ClientInfo): Promise<RotatedSession> {
    const session = await this.sessionModel
      .findOne({ tokenHash: hashOpaqueToken(refreshToken) })
      .lean()
      .exec();
    if (!session) {
      throw invalidRefreshToken();
    }

    if (session.revokedAt) {
      if (session.revokedReason === 'rotated') {
        await this.revokeFamily(session.familyId, 'reuse_detected');
        throw refreshTokenReused();
      }
      throw invalidRefreshToken();
    }

    if (session.expiresAt <= new Date()) {
      throw invalidRefreshToken();
    }

    // Claim the token atomically: the filter only matches while revokedAt is still null,
    // so if two requests race with the same token, exactly one of them wins.
    const claimed = await this.sessionModel
      .findOneAndUpdate(
        { _id: session._id, revokedAt: null },
        { revokedAt: new Date(), revokedReason: 'rotated' },
      )
      .exec();
    if (!claimed) {
      await this.revokeFamily(session.familyId, 'reuse_detected');
      throw refreshTokenReused();
    }

    const issued = await this.issue(session.user, session.familyId, client);
    return { userId: session.user, ...issued };
  }

  /** Called on logout: ends every token from this login, not just the one presented. */
  async end(refreshToken: string): Promise<void> {
    const session = await this.sessionModel
      .findOne({ tokenHash: hashOpaqueToken(refreshToken) })
      .lean()
      .exec();
    if (session) {
      await this.revokeFamily(session.familyId, 'logout');
    }
  }

  private async revokeFamily(familyId: string, reason: RevokeReason): Promise<void> {
    await this.sessionModel
      .updateMany({ familyId, revokedAt: null }, { revokedAt: new Date(), revokedReason: reason })
      .exec();
  }

  private async issue(
    userId: Types.ObjectId,
    familyId: string,
    client: ClientInfo,
  ): Promise<IssuedRefreshToken> {
    const refreshToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * MS_PER_DAY);

    await this.sessionModel.create({
      user: userId,
      familyId,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt,
      userAgent: client.userAgent,
      ip: client.ip,
    });

    return { refreshToken, expiresAt };
  }
}
