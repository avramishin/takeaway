import { plainToClass } from 'class-transformer';
import { Injectable } from '@nestjs/common';

import { Exchange } from './exchange.model';

import { CacheService } from '../cache/cache.service';
import { DynamoService } from '../dynamo/dynamo.service';

@Injectable()
export class ExchangeService {
  private cacheTtl = 300;

  constructor(
    private cacheService: CacheService,
    private dynamoService: DynamoService,
  ) {}

  async getById(id: string) {
    const queryResult = await this.dynamoService.client
      .get({
        TableName: this.dynamoService.globalTable('exchanges'),
        Key: {
          id,
        },
        ProjectionExpression: '#id, #auth, #environment, #oms',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#auth': 'auth',
          '#environment': 'environment',
          '#oms': 'oms',
        },
      })
      .promise();

    return plainToClass(Exchange, queryResult.Item);
  }

  getByIdThruCache(id: string) {
    return this.cacheService.thruCacheAsync<Exchange>(
      () => this.getById(id),
      `exchange-${id}`,
      this.cacheTtl,
    );
  }

  async findAll() {
    const queryResult = await this.dynamoService.client
      .scan({
        TableName: this.dynamoService.globalTable('exchanges'),
        ProjectionExpression: '#id, #auth, #environment, #oms',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#auth': 'auth',
          '#environment': 'environment',
          '#oms': 'oms',
        },
      })
      .promise();

    return queryResult.Items.map(item => plainToClass(Exchange, item));
  }

  findAllThruCache() {
    return this.cacheService.thruCacheAsync<Exchange[]>(
      () => this.findAll(),
      'all-exchanges',
      this.cacheTtl,
    );
  }
}
