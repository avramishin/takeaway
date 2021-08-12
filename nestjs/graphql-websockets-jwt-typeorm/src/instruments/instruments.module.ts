import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InstrumentsService } from './instruments.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { Instrument } from './entities/instrument.entity';
import { Currency } from '../currencies/currency.entity';
import { InstrumentsResolver } from './instruments.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Instrument, Currency])],
  providers: [InstrumentsService, CurrenciesService, InstrumentsResolver],
  exports: [InstrumentsService],
})
export class InstrumentsModule {}
