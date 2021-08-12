import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { EventbridgeService } from './eventbridge.service';

@Module({
  imports: [LoggerModule],
  providers: [EventbridgeService],
  exports: [EventbridgeService],
})
export class EventbridgeModule {}
