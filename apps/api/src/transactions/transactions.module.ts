import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { TransactionFilterService } from './transaction-filter.service';
import { TRANSACTION_MODEL, transactionSchema } from './transaction.schema';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: TRANSACTION_MODEL, schema: transactionSchema }]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionFilterService, TransactionsService],
  // Analytics and exports reuse the same filter service and model, never their own copies.
  exports: [TransactionFilterService, MongooseModule],
})
export class TransactionsModule {}
