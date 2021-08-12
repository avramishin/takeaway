import axios, { AxiosRequestConfig } from 'axios';
import Transport from 'winston-transport';
import { validate, IsUrl, IsNotEmpty } from 'class-validator';

let pendingWrites = 0;

export function flush(): Promise<void> {
  return new Promise(resolve => {
    if (pendingWrites <= 0) {
      resolve();
    } else {
      let attempts = 0;
      const waitInterval = setInterval(() => {
        if (pendingWrites <= 0 || attempts > 50) {
          resolve();
          clearInterval(waitInterval);
        } else {
          attempts++;
        }
      }, 50);
    }
  });
}

export class LoggerTransportConfig {
  @IsUrl()
  url: string;

  @IsNotEmpty()
  apiToken: string;

  @IsNotEmpty()
  project: string;

  @IsNotEmpty()
  channel: string;
}

export class LoggerTransport extends Transport {
  private url: string;
  private apiToken: string;
  private project: string;
  private channel: string;

  constructor(opts: LoggerTransportConfig) {
    super(opts as any);
    validate(opts)
      .then(() => {
        this.url = opts.url;
        this.apiToken = opts.apiToken;
        this.project = opts.project;
        this.channel = opts.channel;
      })
      .catch(error => {
        throw error;
      });
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    pendingWrites++;
    const request = {
      url: `${this.url}/api/submit`,
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
      data: {
        project: this.project,
        channel: this.channel,
        level: (info.level as string).toUpperCase(),
        message: info.message,
        context: info.context || {},
      },
    } as AxiosRequestConfig;
    axios(request)
      .catch(error => console.error(error.message))
      .finally(() => {
        pendingWrites--;
        callback();
      });
  }
}
