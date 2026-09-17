import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, userSchema } from './user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: USER_MODEL, schema: userSchema }])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
