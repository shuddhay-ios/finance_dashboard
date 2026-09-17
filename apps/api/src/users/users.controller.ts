import {
  MAX_AVATAR_BYTES,
  type UserListResponse,
  type UserResponse,
  updateProfileRequestSchema,
  userListResponseSchema,
  userResponseSchema,
} from '@finance/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Types } from 'mongoose';
import { createZodDto } from 'nestjs-zod';
import { type AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { AppError } from '../common/errors/app-error';
import { ProfileService } from './profile.service';
import { UsersService, toUserResponse } from './users.service';

class UserListResponseDto extends createZodDto(userListResponseSchema) {}
class UserResponseDto extends createZodDto(userResponseSchema) {}
class UpdateProfileRequestDto extends createZodDto(updateProfileRequestSchema) {}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Everyone who owns transactions, for the user filter' })
  @ApiOkResponse({ type: UserListResponseDto })
  async list(): Promise<UserListResponse> {
    const users = await this.usersService.findAllWithTransactions();
    return {
      data: users.map((user) => ({
        id: user._id.toString(),
        externalId: user.externalId ?? null,
        name: user.name,
        avatarUrl: user.avatarUrl,
      })),
    };
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change your display name' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileRequestDto,
  ): Promise<UserResponse> {
    return toUserResponse(await this.profileService.updateName(user.id, body.name));
  }

  @Put('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a profile photo (PNG, JPEG or WebP, max 2 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } },
  })
  @ApiOkResponse({ type: UserResponseDto })
  // Multer keeps the upload in memory and stops reading past the size limit, so an oversized
  // file is refused before it is ever fully received.
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } }))
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserResponse> {
    if (!file) {
      throw new AppError('VALIDATION_FAILED', 'No file was uploaded', HttpStatus.BAD_REQUEST, [
        { field: 'avatar', message: 'choose an image to upload' },
      ]);
    }
    return toUserResponse(await this.profileService.setAvatar(user.id, file.buffer));
  }

  @Delete('me/avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove your profile photo and go back to the generated avatar' })
  @ApiOkResponse({ type: UserResponseDto })
  async removeAvatar(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return toUserResponse(await this.profileService.removeAvatar(user.id));
  }

  // Public because an <img> tag can't send a bearer token. A profile photo is not sensitive,
  // and the URL needs the user's unguessable database id.
  @Public()
  @Get(':id/avatar')
  @ApiOperation({ summary: 'A user profile photo' })
  async avatar(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const avatar = Types.ObjectId.isValid(id) ? await this.profileService.findAvatar(id) : null;
    if (!avatar) {
      throw new NotFoundException('No profile photo');
    }
    response.setHeader('Content-Type', avatar.contentType);
    // The URL changes with every upload (?v=...), so a long cache is safe.
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.send(avatar.data);
  }
}
