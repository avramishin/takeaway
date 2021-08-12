import { NestFactory } from '@nestjs/core';
import { BinanceModule } from './binance.module';

async function bootstrap() {
  const app = await NestFactory.create(BinanceModule, {
    logger: console,
  });
  await app.init();
}
bootstrap();
