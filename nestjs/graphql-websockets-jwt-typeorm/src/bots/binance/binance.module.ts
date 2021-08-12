import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BinanceService } from './binance.service';

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  providers: [BinanceService],
})
export class BinanceModule {}
