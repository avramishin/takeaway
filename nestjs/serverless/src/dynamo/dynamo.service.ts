import { Injectable } from '@nestjs/common';
import { DynamoDB } from 'aws-sdk';
import { config } from '../config';
export { QueryInput } from 'aws-sdk/clients/dynamodb';

@Injectable()
export class DynamoService {
  public db = new DynamoDB();
  public client = new DynamoDB.DocumentClient({ region: config.aws.region });

  table(name: string) {
    return `${config.db.prefix}_${name}`;
  }

  globalTable(name: string) {
    return `global_${name}`;
  }
}
