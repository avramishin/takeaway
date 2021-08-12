import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { CacheService } from '../cache/cache.service';
import { DynamoService } from '../dynamo/dynamo.service';
import { User } from './user.model';

@Injectable()
export class UserService {
  private table: string;
  private cacheTtl: 30;
  constructor(
    private dynamoService: DynamoService,
    private cacheService: CacheService,
  ) {
    this.table = this.dynamoService.globalTable('users');
  }

  async getById(id: string) {
    const queryResult = await this.dynamoService.client
      .query({
        TableName: this.table,
        IndexName: 'client_user_id_index',
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeValues: {
          ':pk': id,
        },
        ExpressionAttributeNames: {
          '#pk': 'client_user_id',
        },
        Limit: 1,
      })
      .promise();

    if (queryResult.Items) {
      return plainToClass(User, queryResult.Items[0]);
    }

    throw new Error(`User ${id} not found!`);
  }

  getByIdThruCache(id: string) {
    return this.cacheService.thruCacheAsync<User>(
      () => this.getById(id),
      `user-${id}`,
      this.cacheTtl,
    );
  }
}
