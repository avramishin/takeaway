import { config } from './config';
import axios from 'axios';
import moment from 'moment';

const instances = new Map<
  string,
  (message: string, context?: any) => Promise<any>
>();

export function logglyFactory(prefix: string) {
  let logger = instances.get(prefix);
  if (!logger) {
    logger = async function(message: string, context: any = {}) {
      try {
        const result = await axios({
          url: `https://logs-01.loggly.com/inputs/${config.loggly.token}/tag/${config.loggly.tag}/`,
          method: 'POST',
          headers: {
            'content-type': 'text/plain',
          },
          data:
            prefix +
            ':' +
            message +
            '\n' +
            JSON.stringify(context, null, 2) +
            '\n' +
            'timestamp: ' +
            moment().format(),
        });
        return result;
      } catch (error) {
        console.error(
          `Loggly ERROR: ${error.message}`,
          message,
          context,
          prefix,
        );
      }
    };
    instances.set(prefix, logger);
  }
  return logger;
}
