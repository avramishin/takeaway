import debugFactory from 'debug';
import { logglyFactory } from './loggly';
import { v4 as uuid } from 'uuid';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

const debug = debugFactory('AllExceptionsFilter');
const loggly = logglyFactory('AllExceptionsFilter');

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  async catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = exception.message;

    if ((exception as HttpException).getStatus) {
      status = (exception as HttpException).getStatus();
      message = ((exception as HttpException).getResponse() as any).message;
    }

    const traceId = uuid();
    const stack = exception.stack
      ? exception.stack
          .split('\n')
          .slice(0, 5)
          .map(row => row.trim())
      : 'no stack';

    await loggly(message, {
      request: {
        url: request.url,
        body: request.body,
        query: request.query,
        headers: request.headers,
      },
      user: request.user,
      stack,
      traceId,
    });

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      traceId,
    });
  }
}
