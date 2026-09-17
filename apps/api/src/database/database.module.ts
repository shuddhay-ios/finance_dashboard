import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        uri: env.MONGODB_URI,
        // Building indexes is a deploy-time job (the seed runs syncIndexes), not something
        // every API instance should race to do on startup.
        autoIndex: false,
        // Fail within seconds when MongoDB is down, instead of the driver's default 30s.
        serverSelectionTimeoutMS: 5_000,
      }),
    }),
  ],
})
export class DatabaseModule {}
