import moment from 'moment';
import { DynamoService } from '../dynamo/dynamo.service';
import { EventbridgeService } from '../eventbridge/eventbridge.service';
import { waitFor } from '../helpers/wait-for.helper';
import { ExchangeService } from '../exchange/exchange.service';
import { InstantBuy } from './instant-buy.model';
import { User } from '../user/user.model';
import { UserService } from '../user/user.service';
import { MarketOrderQcService } from '../market-order-qc/market-order-qc.service';
import { Logger } from 'winston';

const TRX_CHECK_INTERVAL = 5000;
const WAIT_DEPOSIT_TIMEOUT = 3600000;
const WAIT_WITHDRAW_TIMEOUT = 3600000;
const WAIT_MKT_TIMEOUT = 300000;

const FINAL_ERROR_STATUS = [
  'init_error',
  'deposit_error',
  'withdraw_error',
  'market_error',
  'success',
];

export class InstantBuyProcessor {
  private table: string;
  private user: User;
  private timeNow = new Date().valueOf();

  constructor(
    private instantBuy: InstantBuy,
    private dynamoService: DynamoService,
    private exchangeService: ExchangeService,
    private eventbridgeService: EventbridgeService,
    private userService: UserService,
    private marketOrderQcService: MarketOrderQcService,
    private logger: Logger,
  ) {
    this.table = this.dynamoService.table('instant_buys');
  }

  async process() {
    if (FINAL_ERROR_STATUS.includes(this.instantBuy.status)) {
      return this.eventbridgeService.publish(
        'InstantBuyFailed',
        this.instantBuy,
      );
    }

    this.user = await this.userService.getByIdThruCache(
      this.instantBuy.client_user_id,
    );

    this.user.exchange = await this.exchangeService.getByIdThruCache(
      this.instantBuy.exchange_id,
    );

    this.user.accessToken = this.instantBuy.access_token;

    if (this.instantBuy.status == 'new') {
      return this.createDeposit();
    }

    if (this.instantBuy.status == 'deposit_pending') {
      return this.waitDeposit();
    }

    if (this.instantBuy.status == 'deposit_success') {
      return this.createMarketOrder();
    }

    if (this.instantBuy.status == 'market_pending') {
      return this.waitMarketOrder();
    }

    if (this.instantBuy.status == 'market_success') {
      return this.createWithdraw();
    }

    if (this.instantBuy.status == 'withdraw_pending') {
      return this.waitWithdraw();
    }

    if (this.instantBuy.status == 'withdraw_success') {
      return this.orderSuccess();
    }
  }

  private async createDeposit() {
    this.logger.info(`Instant Buy createDeposit ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });
    try {
      this.instantBuy.deposit = await this.user
        .getClientSDK()
        .createDeposit(
          this.instantBuy.deposit_product_id,
          this.instantBuy.deposit_amount,
          this.instantBuy.schema_name,
          this.instantBuy.schema_data,
        );
      this.instantBuy.status = 'deposit_pending';
    } catch (error) {
      this.instantBuy.status = 'deposit_error';
      this.instantBuy.message = `Create deposit error: ${error.message}`;
    } finally {
      await this.saveStateContinue();
    }
  }

  private async waitDeposit() {
    this.logger.info(`InstantBuy waitDeposit ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });
    try {
      const deposit = await this.user
        .getClientSDK()
        .getWalletTransaction(this.instantBuy.deposit.txid);

      if (!deposit) {
        throw new Error('deposit record not found');
      }
      this.instantBuy.deposit = deposit;

      if (deposit.status == 'FAILED') {
        this.instantBuy.status = 'deposit_error';
        this.instantBuy.message = deposit.message;
      } else if (deposit.status == 'COMPLETED') {
        this.instantBuy.status = 'deposit_success';
      } else {
        /**  we can't wait forever deposit to complete */
        const depositCreated = moment(deposit.created_at).valueOf();
        if (depositCreated + WAIT_DEPOSIT_TIMEOUT < this.timeNow) {
          this.instantBuy.status = 'deposit_error';
          this.instantBuy.message = `Wait deposit error: timeout exceeded`;
        }
      }
    } catch (error) {
      this.instantBuy.status = 'deposit_error';
      this.instantBuy.message = error.message;
    } finally {
      await this.saveStateContinue(TRX_CHECK_INTERVAL);
    }
  }

  private async createMarketOrder() {
    this.logger.info(`InstantBuy createMarketOrder ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });
    try {
      this.instantBuy.market_order_qc = await this.marketOrderQcService.createOrder(
        {
          instrument: this.instantBuy.instrument_id,
          quantity: this.instantBuy.deposit.amount,
          side: 'buy',
        },
        this.user,
      );
      this.instantBuy.status = 'market_pending';
    } catch (error) {
      this.instantBuy.status = 'market_error';
      this.instantBuy.message = `Create market order error: ${error.messsage}`;
    } finally {
      await this.saveStateContinue();
    }
  }

  private async waitMarketOrder() {
    this.logger.info(`InstantBuy waitMarketOrder ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });

    try {
      const marketOrder = await this.marketOrderQcService.getOrder(
        this.instantBuy.market_order_qc.id,
      );

      if (!marketOrder) {
        throw new Error('market order record not found');
      }

      this.instantBuy.market_order_qc = marketOrder;

      if (marketOrder.status == 'completely_filled') {
        this.instantBuy.status = 'market_success';
      } else if (marketOrder.status == 'rejected') {
        this.instantBuy.status = 'market_error';
        this.instantBuy.message = `Market order error: ${marketOrder.reason}`;
      } else {
        /**  we can't wait forever market order to complete */
        if (marketOrder.open_time + WAIT_MKT_TIMEOUT < this.timeNow) {
          this.instantBuy.status = 'market_error';
          this.instantBuy.message = `Wait market order error: timeout exceeded`;
        }
      }
    } catch (error) {
      this.instantBuy.status = 'market_error';
      this.instantBuy.message = `Market order error: ${error.messsage}`;
    } finally {
      await this.saveStateContinue(TRX_CHECK_INTERVAL);
    }
  }

  private async createWithdraw() {
    this.logger.info(`InstantBuy createWithdraw ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });

    try {
      this.instantBuy.withdraw = await this.user
        .getClientSDK()
        .createWithdraw(
          this.instantBuy.withdraw_product_id,
          this.instantBuy.market_order_qc.executed_base_quantity,
          this.instantBuy.withdraw_address,
        );
      this.instantBuy.status = 'withdraw_pending';
    } catch (error) {
      this.instantBuy.status = 'withdraw_error';
      this.instantBuy.message = `Create withdraw error: ${error.message}`;
    } finally {
      await this.saveStateContinue(TRX_CHECK_INTERVAL);
    }
  }

  private async waitWithdraw() {
    this.logger.info(`InstantBuy waitWithdraw ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });
    try {
      const withdraw = await this.user
        .getClientSDK()
        .getWalletTransaction(this.instantBuy.withdraw.txid);

      if (!withdraw) {
        throw new Error('withdraw record not found');
      }

      this.instantBuy.withdraw = withdraw;

      if (withdraw.status == 'FAILED') {
        this.instantBuy.status = 'withdraw_error';
        this.instantBuy.message = `Wait withdraw error: ${withdraw.message}`;
      } else if (withdraw.status == 'COMPLETED') {
        this.instantBuy.status = 'withdraw_success';
      } else {
        /**  we can't wait forever withdraw to complete */
        const withdrawCreated = moment(withdraw.created_at).valueOf();
        if (withdrawCreated + WAIT_WITHDRAW_TIMEOUT < this.timeNow) {
          this.instantBuy.status = 'withdraw_error';
          this.instantBuy.message = `Wait withdraw error: timeout exceeded`;
        }
      }
    } catch (error) {
      this.instantBuy.status = 'withdraw_error';
      this.instantBuy.message = `Wait withdraw error: ${error.message}`;
    } finally {
      await this.saveStateContinue(TRX_CHECK_INTERVAL);
    }
  }

  private async orderSuccess() {
    this.logger.info(`InstantBuy orderSuccess ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });

    this.instantBuy.status = 'success';
    this.instantBuy.close_time = new Date().valueOf();
    await this.saveState();
    await this.eventbridgeService.publish('InstantBuySuccess', this.instantBuy);
  }

  private async saveStateContinue(waitBeforeContinue = 0) {
    if (FINAL_ERROR_STATUS.includes(this.instantBuy.status)) {
      this.instantBuy.close_time = new Date().valueOf();
    }
    await this.saveState();
    if (waitBeforeContinue) {
      await waitFor(waitBeforeContinue);
    }
    await this.eventbridgeService.publish('InstantBuy', this.instantBuy);
  }

  private async saveState() {
    this.logger.info(`InstantBuy saveState ${this.instantBuy.id}`, {
      context: this.instantBuy,
    });
    return this.dynamoService.client
      .put({
        TableName: this.table,
        Item: this.instantBuy,
      })
      .promise();
  }
}
