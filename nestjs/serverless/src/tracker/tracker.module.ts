import { Module } from '@nestjs/common';
import { DynamoModule } from '../dynamo/dynamo.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { LoggerModule } from '../logger/logger.module';
import { EventbridgeModule } from '../eventbridge/eventbridge.module';
import { TradesTrackerService } from './trades-tracker.service';
import { DepositTrackerService } from './deposit-tracker.service';
import { VolumeRecordsTickerService } from './volume-records-tracker.service';

@Module({
  imports: [DynamoModule, ExchangeModule, EventbridgeModule, LoggerModule],
  providers: [
    TradesTrackerService,
    DepositTrackerService,
    VolumeRecordsTickerService,
  ],
})
export class TrackerModule {}
