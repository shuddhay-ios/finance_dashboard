import type { UserResponse } from '@finance/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { escapeRegex } from '../common/escape-regex';
import { USER_MODEL, type User } from './user.schema';

export type UserRecord = User & { _id: Types.ObjectId };

interface IdOnly {
  _id: Types.ObjectId;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(USER_MODEL) private readonly userModel: Model<User>) {}

  /** The only lookup that loads passwordHash, and only the login check calls it. */
  findByEmailWithPasswordHash(email: string): Promise<UserRecord | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .lean<UserRecord>()
      .exec();
  }

  async findById(id: string): Promise<UserRecord | null> {
    // A malformed id can't match anything; checking first avoids a Mongoose CastError (a 500).
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).lean<UserRecord>().exec();
  }

  findByIds(ids: Types.ObjectId[]): Promise<UserRecord[]> {
    return this.userModel
      .find({ _id: { $in: ids } })
      .lean<UserRecord[]>()
      .exec();
  }

  /** Translates the ids users see ("user_001") into the ObjectIds stored on transactions. */
  async findIdsByExternalIds(externalIds: string[]): Promise<Types.ObjectId[]> {
    const users = await this.userModel
      .find({ externalId: { $in: externalIds } }, { _id: 1 })
      .lean<IdOnly[]>()
      .exec();
    return users.map((user) => user._id);
  }

  /** Users whose name, email or externalId contains the search term (case-insensitive). */
  async findIdsMatching(term: string): Promise<Types.ObjectId[]> {
    const containsTerm = new RegExp(escapeRegex(term), 'i');
    const users = await this.userModel
      .find(
        { $or: [{ name: containsTerm }, { email: containsTerm }, { externalId: containsTerm }] },
        { _id: 1 },
      )
      .lean<IdOnly[]>()
      .exec();
    return users.map((user) => user._id);
  }
}

/** Copies safe fields one by one, so passwordHash can never reach a response. */
export function toUserResponse(user: UserRecord): UserResponse {
  return {
    id: user._id.toString(),
    externalId: user.externalId ?? null,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}
