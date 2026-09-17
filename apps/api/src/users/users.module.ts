import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AVATAR_MODEL, avatarSchema } from './avatar.schema';
import { ProfileService } from './profile.service';
import { USER_MODEL, userSchema } from './user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: userSchema },
      { name: AVATAR_MODEL, schema: avatarSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, ProfileService],
  exports: [UsersService],
})
export class UsersModule {}
