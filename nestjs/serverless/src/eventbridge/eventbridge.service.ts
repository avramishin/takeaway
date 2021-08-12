import AWS from 'aws-sdk';
import { Injectable, Inject } from '@nestjs/common';
import { config } from '../config';
import { Logger } from 'winston';

@Injectable()
export class EventbridgeService {
  private eventBridge: AWS.EventBridge;
  constructor(@Inject('Logger') private logger: Logger) {
    try {
      this.eventBridge = new AWS.EventBridge({
        region: config.aws.region,
      });
    } catch (error) {
      this.logger.error(`create EventBridge error: ${error.message}`, {
        context: error.stack,
      });
    }
  }

  publish(detailType: string, detail: any, noLog?: boolean): Promise<void> {
    return new Promise(resolve => {
      if (!noLog) {
        this.logger.debug(detailType, { context: detail });
      }

      if (!this.eventBridge) {
        return resolve();
      }

      const params = {
        Entries: [
          {
            Time: new Date(),
            EventBusName: config.evenBridge.bus,
            DetailType: detailType,
            Detail: JSON.stringify(detail),
            Source: config.service.name,
          },
        ],
      };

      this.eventBridge.putEvents(params, async error => {
        if (error) {
          this.logger.error('putEvents ' + error.message, {
            context: { params, stack: error.stack },
          });
        }
        resolve();
      });
    });
  }
}
