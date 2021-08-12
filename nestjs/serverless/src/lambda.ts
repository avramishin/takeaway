import AWS from 'aws-sdk';
import { Handler, Context, SQSHandler } from 'aws-lambda';
import { Server } from 'http';
import { createServer, proxy } from 'aws-serverless-express';
import { eventContext } from 'aws-serverless-express/middleware';
import { ValidationPipe } from '@nestjs/common';

import { NestApplication, NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './all-exceptions.filter';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { MarketOrderQcService } from './market-order-qc/market-order-qc.service';
import { InstantBuyService } from './instant-buy/instant-buy.service';
import { TradesTrackerService } from './tracker/trades-tracker.service';
import { DepositTrackerService } from './tracker/deposit-tracker.service';
import { LoggerInterceptor } from './logger/logger.interceptor';

import { config } from './config';
AWS.config.update({ region: config.aws.region });

import { AppModule } from './app.module';

import express = require('express');
const binaryMimeTypes: string[] = [];

let cachedServer: Server;
let cachedApp: NestApplication;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    cachedApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    cachedApp.enableCors({
      preflightContinue: true,
      origin: true,
    });
    cachedApp.useGlobalFilters(new AllExceptionsFilter());
    cachedApp.useGlobalInterceptors(new LoggerInterceptor());
    cachedApp.use(eventContext());
    cachedApp.enableShutdownHooks();
    cachedApp.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );

    const options = new DocumentBuilder()
      .setTitle('Trade Service')
      .setDescription('The Trade Service API description')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'accessToken',
      )
      .build();

    const document = SwaggerModule.createDocument(cachedApp, options, {});
    SwaggerModule.setup('/swagger', cachedApp, document);
    await cachedApp.init();
    cachedServer = createServer(expressApp, undefined, binaryMimeTypes);
  }

  return { cachedServer, cachedApp };
}

export const httpHandler: Handler = async (event: any, context: Context) => {
  const { cachedServer } = await bootstrap();
  return proxy(cachedServer, event, context, 'PROMISE').promise;
};

export const sqsMarketOrderQcHandler: SQSHandler = async event => {
  const { cachedApp } = await bootstrap();
  try {
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const service = cachedApp.get(MarketOrderQcService);
      await service.process(message.detail.id);
    }
  } catch (error) {
    console.error(error);
  }
};

export const sqsInstantBuyHandler: SQSHandler = async event => {
  const { cachedApp } = await bootstrap();
  try {
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const service = cachedApp.get(InstantBuyService);
      await service.process(message.detail.id);
    }
  } catch (error) {
    console.error(error);
  }
};

export const sqsTradeVolumeHandler: SQSHandler = async event => {
  const { cachedApp } = await bootstrap();
  try {
    for (const rec of event.Records) {
      const message = JSON.parse(rec.body);
      const service = cachedApp.get(TradesTrackerService);
      await service.process(message);
    }
  } catch (error) {
    console.error(error);
  }
};

export const sqsDepositVolumeHandler: SQSHandler = async event => {
  const { cachedApp } = await bootstrap();
  try {
    for (const rec of event.Records) {
      const message = JSON.parse(rec.body);
      const service = cachedApp.get(DepositTrackerService);
      await service.process(message);
    }
  } catch (error) {
    console.error(error);
  }

};
