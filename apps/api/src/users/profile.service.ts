import type { AvatarContentType } from '@finance/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppError } from '../common/errors/app-error';
import { API_PREFIX } from '../configure-app';
import { AVATAR_MODEL, type Avatar } from './avatar.schema';
import { defaultAvatarUrl } from './default-avatar';
import { detectImageType } from './image-type';
import { USER_MODEL, type User } from './user.schema';
import type { UserRecord } from './users.service';

export interface StoredAvatar {
  contentType: AvatarContentType;
  data: Buffer;
}

/** The logged-in user's own profile: display name and profile photo. */
@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(USER_MODEL) private readonly userModel: Model<User>,
    @InjectModel(AVATAR_MODEL) private readonly avatarModel: Model<Avatar>,
  ) {}

  updateName(userId: string, name: string): Promise<UserRecord> {
    return this.updateUser(userId, { name });
  }

  async setAvatar(userId: string, bytes: Buffer): Promise<UserRecord> {
    const contentType = detectImageType(bytes);
    if (!contentType) {
      throw new AppError(
        'VALIDATION_FAILED',
        'The file is not a PNG, JPEG or WebP image',
        HttpStatus.BAD_REQUEST,
        [{ field: 'avatar', message: 'must be a PNG, JPEG or WebP image' }],
      );
    }

    await this.avatarModel
      .updateOne({ user: userId }, { contentType, data: bytes }, { upsert: true })
      .exec();
    // The version number changes the URL on every upload, so browsers can't keep showing
    // the old photo from their cache.
    return this.updateUser(userId, {
      avatarUrl: `/${API_PREFIX}/users/${userId}/avatar?v=${Date.now()}`,
    });
  }

  async removeAvatar(userId: string): Promise<UserRecord> {
    await this.avatarModel.deleteOne({ user: userId }).exec();
    const user = await this.userModel.findById(userId).lean<UserRecord>().exec();
    return this.updateUser(userId, { avatarUrl: defaultAvatarUrl(user?.externalId ?? userId) });
  }

  async findAvatar(userId: string): Promise<StoredAvatar | null> {
    const avatar = await this.avatarModel
      .findOne({ user: userId })
      .lean<{ contentType: AvatarContentType; data: { buffer: ArrayBuffer } | Buffer }>()
      .exec();
    if (!avatar) {
      return null;
    }
    // .lean() returns MongoDB's Binary wrapper instead of a Node Buffer.
    const data = Buffer.isBuffer(avatar.data) ? avatar.data : Buffer.from(avatar.data.buffer);
    return { contentType: avatar.contentType, data };
  }

  private async updateUser(userId: string, changes: Partial<User>): Promise<UserRecord> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, changes, { new: true, runValidators: true })
      .lean<UserRecord>()
      .exec();
    if (!user) {
      throw new AppError('AUTH_TOKEN_INVALID', 'User no longer exists', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }
}
