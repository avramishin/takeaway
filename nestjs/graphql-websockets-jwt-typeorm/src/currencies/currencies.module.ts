import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrenciesService } from './currencies.service';
import { Currency } from './currency.entity';
import { CurrenciesResolver } from './currencies.resolver';
import { PubSubService } from '../pubsub.service';

@Module({
  imports: [TypeOrmModule.forFeature([Currency])],
  providers: [CurrenciesService, PubSubService, CurrenciesResolver],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
