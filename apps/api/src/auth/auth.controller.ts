import type { LoginResponse, MeResponse, RefreshResponse } from '@finance/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppError } from '../common/errors/app-error';
import { LoginRequestDto, LoginResponseDto, MeResponseDto, RefreshResponseDto } from './auth.dto';
import { AuthService } from './auth.service';
import { type AuthenticatedUser, CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './refresh-cookie';
import type { ClientInfo } from './sessions.service';

// Browsers send long user-agent strings; the first 256 characters identify a device fine.
const MAX_USER_AGENT_LENGTH = 256;

function clientInfo(request: Request): ClientInfo {
  return {
    userAgent: request.headers['user-agent']?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
    ip: request.ip ?? null,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  // Only login is rate limited: it's the one route where guessing is possible.
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in; returns an access token and sets the refresh cookie' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() body: LoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(body.email, body.password, clientInfo(request));
    setRefreshCookie(response, result.refreshToken, result.expiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  // Public because the access token has usually expired by the time this is called;
  // the refresh cookie is the credential here.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Swap the refresh cookie for a new access token and a new cookie' })
  @ApiOkResponse({ type: RefreshResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshResponse> {
    const refreshToken = readRefreshCookie(request);
    if (!refreshToken) {
      throw new AppError('AUTH_TOKEN_INVALID', 'No refresh token', HttpStatus.UNAUTHORIZED);
    }

    try {
      const result = await this.authService.refresh(refreshToken, clientInfo(request));
      setRefreshCookie(response, result.refreshToken, result.expiresAt);
      return { accessToken: result.accessToken };
    } catch (error) {
      // A dead refresh token should not stay in the browser.
      clearRefreshCookie(response);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the session and clear the refresh cookie' })
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = readRefreshCookie(request);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearRefreshCookie(response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The logged-in user' })
  @ApiOkResponse({ type: MeResponseDto })
  async me(@CurrentUser() currentUser: AuthenticatedUser): Promise<MeResponse> {
    return { user: await this.authService.me(currentUser.id) };
  }
}
