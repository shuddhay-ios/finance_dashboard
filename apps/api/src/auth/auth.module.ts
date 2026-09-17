import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SESSION_MODEL, sessionSchema } from './session.schema';
import { SessionsService } from './sessions.service';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: SESSION_MODEL, schema: sessionSchema }]),
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { algorithm: 'HS256', expiresIn: env.ACCESS_TOKEN_TTL_SECONDS },
        // Pinning the algorithm stops a forged token choosing a weaker one (e.g. "none").
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => [{ ttl: ONE_MINUTE_MS, limit: env.LOGIN_ATTEMPTS_PER_MINUTE }],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    // APP_GUARD makes this guard run on every route in the whole app, not just this module.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
