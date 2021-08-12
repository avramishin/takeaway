import { createLogger, transports } from 'winston';
import { format } from 'logform/dist/browser';
import { LoggerTransport } from './logger.transport';
import { config } from '../config';

export const logger = createLogger({
  level: 'debug',
  format: format.combine(format.splat(), format.simple()),
  transports: [
    new transports.Console(),
    new LoggerTransport({
      url: config.logServer.url,
      apiToken: config.logServer.apiToken,
      project: config.logServer.project,
      channel: config.logServer.channel,
    }),
  ],
});

export const loggerFactory = {
  provide: 'Logger',
  useFactory: () => logger,
};
