import { Injectable } from '@nestjs/common';
import { ExchangeService } from '../exchange/exchange.service';
import { EventbridgeService } from '../eventbridge/eventbridge.service';
import { ClosedOrderDto } from './dto/order-closed.dto';
import {
  VolumeRecordPeriod,
  VolumeRecordsTickerService,
  VolumeRecordType,
} from './volume-records-tracker.service';
import moment from 'moment';
import { Quote } from '@shiftforex/client-sdkv2/dist/eds/interfaces/quote.interface';
import debugFactory from 'debug';

@Injectable()
export class TradesTrackerService {
  constructor(
    private volumeRecordsTrackerService: VolumeRecordsTickerService,
    private exchangeService: ExchangeService,
    private eventbridgeService: EventbridgeService,
  ) {}

  async process(message: ClosedOrderDto) {
    const debug = debugFactory('TradesTrackerService:process');
    if (
      message['detail-type'] != 'OrderClosed' ||
      message.detail.executed_quantity <= 0
    )
      return;
    let ts = new Date(message.detail.close_time);

    let volume = await this.getUsdVolume(
      message.detail.exchange_id,
      message.detail.instrument_id,
      message.detail.executed_quantity,
    );

    let dayVolume = await this.volumeRecordsTrackerService.incrementVolume(
      message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.DAY,
      ts,
      volume,
    );

    await this.eventbridgeService.publish(
      'TradeVolumeRecord',
      {
        exchange_id: message.detail.exchange_id,
        period: 'DAY',
        volume: dayVolume,
        date: this.volumeRecordsTrackerService.formatDate(
          ts,
          VolumeRecordPeriod.DAY,
        ),
        ts: moment(ts).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
      },
      true,
    );

    let weekVolume = await this.volumeRecordsTrackerService.incrementVolume(
      message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.WEEK,
      ts,
      volume,
    );

    await this.eventbridgeService.publish(
      'TradeVolumeRecord',
      {
        exchange_id: message.detail.exchange_id,
        period: 'WEEK',
        volume: weekVolume,
        date: this.volumeRecordsTrackerService.formatDate(
          ts,
          VolumeRecordPeriod.WEEK,
        ),
        ts: moment(ts).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
      },
      true,
    );

    let monthVolume = await this.volumeRecordsTrackerService.incrementVolume(
      message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.MONTH,
      ts,
      volume,
    );

    await this.eventbridgeService.publish(
      'TradeVolumeRecord',
      {
        exchange_id: message.detail.exchange_id,
        period: 'MONTH',
        volume: monthVolume,
        date: this.volumeRecordsTrackerService.formatDate(
          ts,
          VolumeRecordPeriod.MONTH,
        ),
        ts: moment(ts).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
      },
      true,
    );
  }

  async getUsdVolume(
    exchange_id: string,
    instrument: string,
    quantity: number,
  ) {
    const debug = debugFactory('TradesTrackerService:getUsdVolume');
    let exchange = await this.exchangeService.getByIdThruCache(exchange_id);
    if (!exchange) {
      throw new Error(`Exchange not found ${exchange_id}`);
    }
    let quoteInstrument: string;
    let quote: Quote;
    try {
      const instruments = await exchange.getInstrumentsThruCache();
      const instrumentObject = instruments.find(i => i.id == instrument);

      if (!instrument) {
        throw new Error('Instrument not found');
      }

      if (instrumentObject.base_product == 'USD') {
        return quantity;
      }

      quoteInstrument = instrumentObject.base_product + 'USD';
    } catch (error) {
      debug(`Error: ${error.message}`, {
        exchange_id,
        instrument,
        quantity,
      });
      throw error;
    }

    try {
      quote = await exchange.getQuoteForInstrumentThruCache(quoteInstrument);
    } catch (e) {
      const message = `Quote not found for ${exchange_id} / ${instrument}`;
      debug(`Error: ${message}`, {
        exchange_id,
        instrument,
        quantity,
      });
      throw new Error(message);
    }

    return quantity * quote.bid;
  }
}
