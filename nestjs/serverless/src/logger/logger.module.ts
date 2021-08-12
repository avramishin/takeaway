import { Module } from '@nestjs/common';
import { loggerFactory } from './logger.provider';

@Module({
  providers: [loggerFactory],
  exports: ['Logger'],
})
export class LoggerModule {}
