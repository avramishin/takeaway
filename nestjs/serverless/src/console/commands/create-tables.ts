import AWS, { DynamoDB } from 'aws-sdk';
import { config } from '../../config';
AWS.config.update({ region: config.aws.region });

const db = new DynamoDB();

async function createExchangesTable() {
  console.log('creating `exchanges` table');
  await db
    .createTable({
      TableName: `${config.db.prefix}_exchanges`,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
    .promise();
}

async function createMarketOrdersQCTable() {
  console.log('creating `market_orders_qc` table');
  await db
    .createTable({
      TableName: `${config.db.prefix}_market_orders_qc`,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'exchange_id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'client_user_id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'open_time',
          AttributeType: 'N',
        },
      ],
      GlobalSecondaryIndexes: [
        {
          Projection: {
            ProjectionType: 'ALL',
          },
          IndexName: 'exchange_id_index',
          KeySchema: [
            { AttributeName: 'exchange_id', KeyType: 'HASH' },
            {
              AttributeName: 'open_time',
              KeyType: 'RANGE',
            },
          ],
        },
        {
          Projection: {
            ProjectionType: 'ALL',
          },
          IndexName: 'client_user_id_index',
          KeySchema: [
            { AttributeName: 'client_user_id', KeyType: 'HASH' },
            {
              AttributeName: 'open_time',
              KeyType: 'RANGE',
            },
          ],
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
    .promise();
}

async function createInstantBuysTable() {
  console.log('creating `instant_buys` table');
  await db
    .createTable({
      TableName: `${config.db.prefix}_instant_buys`,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'exchange_id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'client_user_id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'open_time',
          AttributeType: 'N',
        },
      ],
      GlobalSecondaryIndexes: [
        {
          Projection: {
            ProjectionType: 'ALL',
          },
          IndexName: 'exchange_id_index',
          KeySchema: [
            { AttributeName: 'exchange_id', KeyType: 'HASH' },
            {
              AttributeName: 'open_time',
              KeyType: 'RANGE',
            },
          ],
        },
        {
          Projection: {
            ProjectionType: 'ALL',
          },
          IndexName: 'client_user_id_index',
          KeySchema: [
            { AttributeName: 'client_user_id', KeyType: 'HASH' },
            {
              AttributeName: 'open_time',
              KeyType: 'RANGE',
            },
          ],
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
    .promise();
}

export async function createTables() {
  const { TableNames: tables } = await db.listTables().promise();
  if (!tables.includes(`${config.db.prefix}_exchanges`)) {
    await createExchangesTable();
  } else {
    console.log(`${config.db.prefix}_exchanges exists`);
  }

  if (!tables.includes(`${config.db.prefix}_market_orders_qc`)) {
    await createMarketOrdersQCTable();
  } else {
    console.log(`${config.db.prefix}_market_orders_qc exists`);
  }

  if (!tables.includes(`${config.db.prefix}_instant_buys`)) {
    await createInstantBuysTable();
  } else {
    console.log(`${config.db.prefix}_instant_buys exists`);
  }
}
