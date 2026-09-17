import { type UserListResponse, userListResponseSchema } from '@finance/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { UsersService } from './users.service';

class UserListResponseDto extends createZodDto(userListResponseSchema) {}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
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
}
