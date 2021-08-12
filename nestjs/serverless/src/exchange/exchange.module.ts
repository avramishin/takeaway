import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { CacheModule } from '../cache/cache.module';
import { DynamoModule } from '../dynamo/dynamo.module';
import { ExchangeService } from './exchange.service';

@Module({
  imports: [CacheModule, DynamoModule, LoggerModule],
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}
