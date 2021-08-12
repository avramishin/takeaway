import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from './config';

export const typeOrmConnection = TypeOrmModule.forRoot({
  type: 'mysql',
  url: config.db.url,
  entities: [__dirname + '/**/*.entity.{js,ts}'],
  subscribers: [__dirname + '/**/*.subscriber.{js,ts}'],
  synchronize: true,
});
