import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountsModule } from '../accounts/accounts.module';
import { AuthModule } from '../auth/auth.module';

import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { PubSubService } from '../pubsub.service';

@Module({
  imports: [AccountsModule, AuthModule, TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersResolver, PubSubService],
  exports: [UsersService],
})
export class UsersModule {}
