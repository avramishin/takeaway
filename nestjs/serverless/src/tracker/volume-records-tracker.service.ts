import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { DynamoService } from '../dynamo/dynamo.service';

export enum VolumeRecordPeriod {
  MONTH,
  WEEK,
  DAY,
};

export enum VolumeRecordType {
  TRADE,
  DEPOSIT,
}

export class VolumeRecord {
  id: string;
  date: string;
  volume: number;
  updated_at: Date;
}

const TABLE = 'volume_records';

@Injectable()
export class VolumeRecordsTickerService {
  constructor(private dynamoService: DynamoService) { }

  formatDate(ts: Date, period: VolumeRecordPeriod) {
    switch (period) {
      case VolumeRecordPeriod.DAY:
        return moment(ts).format('YYYY-MM-DD');
      case VolumeRecordPeriod.WEEK:
        return moment(ts).format('YYYY-WW');
      case VolumeRecordPeriod.MONTH:
        return moment(ts).format('YYYY-MM');
    }
  }

  async getVolume(exchange: string, recordType: VolumeRecordType, period: VolumeRecordPeriod, ts: Date): Promise<number> {
    let date = this.formatDate(ts, period);
    let id = `${exchange}-${VolumeRecordType[recordType]}-${VolumeRecordPeriod[period]}`;
    const queryResult = await this.dynamoService.client
      .get({
        TableName: this.dynamoService.globalTable(TABLE),
        Key: {
          id,
          date,
        },
        ProjectionExpression: '#id, #volume, #updated_at',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#volume': 'volume',
          '#updated_at': 'updated_at',
        },
      })
      .promise();

    if (queryResult.Item) {
      return plainToClass(VolumeRecord, queryResult.Item).volume;
    }
    return 0;
  }

  async setVolume(exchange: string, recordType: VolumeRecordType, period: VolumeRecordPeriod, ts: Date, volume: number) {
    let date = this.formatDate(ts, period);
    let id = `${exchange}-${VolumeRecordType[recordType]}-${VolumeRecordPeriod[period]}`;
    await this.dynamoService.client
      .put({
        TableName: this.dynamoService.globalTable(TABLE),
        Item: {
          id,
          date,
          volume: Number(volume.toFixed(2)),
          updated_at: new Date().getTime(),
        },
        ConditionExpression: 'attribute_not_exists(id)',
      })
      .promise();
  }

  async incrementVolume(exchange: string, recordType: VolumeRecordType, period: VolumeRecordPeriod, ts: Date, increment: number) {
    let date = this.formatDate(ts, period);
    let id = `${exchange}-${VolumeRecordType[recordType]}-${VolumeRecordPeriod[period]}`;
    try {
      await this.setVolume(exchange, recordType, period, ts, increment);
    } catch (e) {
      if (e.code != 'ConditionalCheckFailedException') {
        throw e;
      }
      await this.dynamoService.client.update({
        TableName: this.dynamoService.globalTable(TABLE),
        Key: {
          id,
          date,
        },
        UpdateExpression: "set volume = volume + :increment, updated_at = :updated_at",
        ExpressionAttributeValues: {
          ":increment": Number(increment.toFixed(2)),
          ":updated_at": new Date().getTime(),
        }
      }).promise();
    }
    return await this.getVolume(exchange, recordType, period, ts);
  }

  async getMaxVolumesById(exchange: string, recordType: VolumeRecordType, period: VolumeRecordPeriod, ts: Date) {
    let date = this.formatDate(ts, period);
    let id = `${exchange}-${VolumeRecordType[recordType]}-${VolumeRecordPeriod[period]}`;
    let result = await this.dynamoService.client.query({
      TableName: this.dynamoService.globalTable(TABLE),
      KeyConditionExpression: "#id = :id",
      ExpressionAttributeNames: {
        "#id": "id"
      },
      ExpressionAttributeValues: {
        ":id": id
      }
    }).promise();
    let max = 0;
    for (let row of result.Items) {
      if (row.date == date) continue;
      if (row.volume > max) {
        max = row.volume;
      }
    }
    return max;
  }

}
