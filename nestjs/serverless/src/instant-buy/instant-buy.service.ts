import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import moment from 'moment';
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { plainToClass } from 'class-transformer';

import { CreateInstantBuy } from './dto/create-instant-buy.dto';
import { EstimateInstantBuy } from './dto/estimate-instant-buy.dto';
import { InstantBuyPagedFilter } from './dto/instant-buy-paged-filter.dto';
import { GetSchema } from './dto/get-schema.dto';

import { InstantBuy } from './instant-buy.model';
import { User } from '../user/user.model';

import { OrderbookService } from '../orderbook/orderbook.service';
import { EventbridgeService } from '../eventbridge/eventbridge.service';
import { DynamoService, QueryInput } from '../dynamo/dynamo.service';
import { ExchangeService } from '../exchange/exchange.service';
import { WalletTransaction } from '@shiftforex/client-sdkv2';
import { InstantBuyProcessor } from './instant-buy.processor';
import { UserService } from '../user/user.service';
import { MarketOrderQcService } from '../market-order-qc/market-order-qc.service';
import { Logger } from 'winston';

const MARKET_RISK_RATE = 1.5;

@Injectable()
export class InstantBuyService {
  private table: string;
  constructor(
    private dynamoService: DynamoService,
    private eventBridgeService: EventbridgeService,
    private orderbookService: OrderbookService,
    private exchangeService: ExchangeService,
    private userService: UserService,
    private marketOrderQcService: MarketOrderQcService,
    @Inject('Logger') private logger: Logger,
  ) {
    this.table = this.dynamoService.table('instant_buys');
  }

  async createOrder(request: CreateInstantBuy, user: User) {
    const instrument = _.find(await user.getInstrumentsThruCache(), {
      id: request.base_product + request.quote_product,
    });

    const instantBuy = new InstantBuy();
    instantBuy.id = uuid();
    instantBuy.exchange_id = user.exchange.id;
    instantBuy.instrument_id = instrument.id;
    instantBuy.client_user_id = user.id;
    instantBuy.deposit_product_id = request.quote_product;
    instantBuy.withdraw_product_id = request.base_product;
    instantBuy.withdraw_address = request.withdraw_address;
    instantBuy.status = 'new';
    instantBuy.schema_name = request.schema_name;
    instantBuy.schema_data = request.schema_data;
    instantBuy.deposit_amount = request.amount;
    instantBuy.deposit = {} as WalletTransaction;
    instantBuy.withdraw = {} as WalletTransaction;
    instantBuy.access_token = user.accessToken;
    instantBuy.estimate = await this.estimateOrder(request, user);
    instantBuy.open_time = new Date().valueOf();
    await this.dynamoService.client
      .put({
        TableName: this.table,
        Item: instantBuy,
      })
      .promise();

    await this.eventBridgeService.publish('InstantBuy', instantBuy);
    return instantBuy;
  }

  getSchemas(request: GetSchema, user: User) {
    return user.getClientSDK().getSchemas(request.product, request.type);
  }

  async getById(id: string) {
    const result = await this.dynamoService.client
      .get({
        TableName: this.table,
        Key: {
          id,
        },
      })
      .promise();

    return plainToClass(InstantBuy, result.Item);
  }

  /**
   * Method to invoke from lambda triggered my InstantBuy message
   * @param orderId
   */
  async process(orderId: string) {
    try {
      const processor = new InstantBuyProcessor(
        await this.getById(orderId),
        this.dynamoService,
        this.exchangeService,
        this.eventBridgeService,
        this.userService,
        this.marketOrderQcService,
        this.logger,
      );
      await processor.process();
    } catch (error) {
      await this.dynamoService.client
        .update({
          TableName: this.table,
          Key: {
            id: orderId,
          },
          UpdateExpression: 'set #error = :error, #status = :status',
          ExpressionAttributeNames: {
            '#error': 'error',
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':error': error.message,
            ':status': 'init_error',
          },
        })
        .promise();
    }
  }

  async getOrders(filter: InstantBuyPagedFilter, user: User) {
    const dateFrom = filter.filter_date_from
      ? moment(filter.filter_date_from).valueOf()
      : 0;

    const dateTo = filter.filter_date_to
      ? moment(filter.filter_date_to).valueOf()
      : moment().valueOf();

    const params = {
      TableName: this.table,
      IndexName: 'client_user_id_index',
      KeyConditionExpression:
        'client_user_id = :userId AND open_time BETWEEN :dateFrom AND :dateTo',
      ExpressionAttributeValues: {
        ':userId': user.id,
        ':dateFrom': dateFrom,
        ':dateTo': dateTo,
      },

      ScanIndexForward: filter.sort_direction == 'asc',
      Limit: filter.pager_limit,
    } as QueryInput;

    if (filter.exclusive_start_key) {
      params.ExclusiveStartKey = filter.exclusive_start_key;
    }

    const result = await this.dynamoService.client.query(params).promise();

    return {
      items: result.Items.map(item => plainToClass(InstantBuy, item)),
      pager_limit: filter.pager_limit,
      last_evaluated_key: result.LastEvaluatedKey,
    };
  }

  async estimateOrder(request: EstimateInstantBuy, user: User) {
    const instrument = _.find(await user.getInstrumentsThruCache(), {
      id: request.base_product + request.quote_product,
    });

    if (!instrument) {
      throw new BadRequestException('Instrument not found');
    }

    const products = await user.getProductsThruCache();

    const baseProduct = _.find(products, { id: instrument.base_product });
    const quoteProduct = _.find(products, { id: instrument.quote_product });

    const orderbook = await this.orderbookService.getOrderbook(
      user.exchange,
      instrument.id,
    );

    if (!orderbook) {
      throw new BadRequestException('No market at the moment');
    }

    const amountAfterDeposit = _.round(
      request.amount -
        request.amount * (quoteProduct.deposit.commissions.progressive / 100) -
        quoteProduct.deposit.commissions.flat,
      quoteProduct.precision,
    );

    if (amountAfterDeposit <= 0) {
      throw new BadRequestException(
        `Amount after deposit including fees is less than zero`,
      );
    }

    const requiredQty = amountAfterDeposit;

    let layer: number;
    let availableQty = 0;
    let availableQuoteQty = 0;

    const orderbookSide = orderbook.getSellSide();
    for (layer = 0; layer < orderbookSide.length; layer++) {
      const safeQuantity = requiredQty / orderbookSide[layer].price;

      if (safeQuantity < availableQty) {
        break;
      }
      if (availableQuoteQty >= requiredQty) {
        break;
      }

      availableQty += orderbookSide[layer].volume;
      availableQuoteQty +=
        orderbookSide[layer].volume * orderbookSide[layer].price;
    }

    if (availableQuoteQty < requiredQty * MARKET_RISK_RATE) {
      throw new BadRequestException('Not enough market liquidity');
    }

    const vwap = orderbook.getVolumeWeightedAvgPrice('sell', availableQty);

    const baseQtyBeforeTrade = amountAfterDeposit / vwap.price;

    if (baseQtyBeforeTrade * 0.95 < instrument.min_quantity) {
      throw new BadRequestException(
        `Amount to trade ${baseQtyBeforeTrade} is less than min amount`,
      );
    }

    if (baseQtyBeforeTrade * 1.05 > instrument.max_quantity) {
      throw new BadRequestException(
        `Amount to trade ${baseQtyBeforeTrade} is greater than max amount`,
      );
    }

    const baseQtyAfterTrade = _.round(
      baseQtyBeforeTrade -
        (instrument.fees.buy.maker_commission_progressive / 100) *
          baseQtyBeforeTrade -
        instrument.fees.buy.maker_commission_flat,
      baseProduct.precision,
    );

    if (baseQtyAfterTrade < baseProduct.withdraw.min_amount) {
      throw new BadRequestException(
        `Amount to withdraw ${baseQtyAfterTrade} is less than min amount ${baseProduct.withdraw.min_amount}`,
      );
    }

    const amountAfterWithdraw =
      baseQtyAfterTrade -
      baseQtyAfterTrade * (baseProduct.withdraw.commissions.progressive / 100) -
      baseProduct.withdraw.commissions.flat;

    return {
      amountAfterDeposit,
      baseQtyBeforeTrade,
      baseQtyAfterTrade,
      amountAfterWithdraw,
      availableQty,
      availableQuoteQty,
      vwap,
      quoteProduct,
      baseProduct,
      instrument,
    };
  }
}
