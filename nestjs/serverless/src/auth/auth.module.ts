import { Global, Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { CacheModule } from '../cache/cache.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { DynamoModule } from '../dynamo/dynamo.module';

@Global()
@Module({
  imports: [CacheModule, ExchangeModule, DynamoModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
