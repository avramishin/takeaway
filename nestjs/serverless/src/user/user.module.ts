import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { CacheModule } from '../cache/cache.module';
import { DynamoModule } from '../dynamo/dynamo.module';
import { UserService } from './user.service';

@Module({
  imports: [CacheModule, DynamoModule, LoggerModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
