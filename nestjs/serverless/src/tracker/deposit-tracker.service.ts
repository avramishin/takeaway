import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { ExchangeService } from '../exchange/exchange.service';
import { EventbridgeService } from '../eventbridge/eventbridge.service';
import { DepositCompletedDto } from './dto/deposit-completed.dto';
import { VolumeRecordPeriod, VolumeRecordsTickerService, VolumeRecordType } from './volume-records-tracker.service';

@Injectable()
export class DepositTrackerService {
  constructor(
    private volumeRecordsTrackerService: VolumeRecordsTickerService,
    private exchangeService: ExchangeService,
    private eventbridgeService: EventbridgeService,
  ) { }

  async process(message: DepositCompletedDto) {
    if (message['detail-type'] != 'DepositCompleted' || message.detail.status != 'COMPLETED') return;
    let ts = moment(message.detail.updated_at).toDate();

    let volume = await this.getUsdVolume(message.detail.exchange_id, message.detail.product_id, Number(message.detail.amount));

    let monthVolume = await this.volumeRecordsTrackerService.incrementVolume(
      message.detail.exchange_id,
      VolumeRecordType.DEPOSIT,
      VolumeRecordPeriod.MONTH,
      ts,
      volume
    );

    let previousMonthVolume = await this.volumeRecordsTrackerService.getVolume(
      message.detail.exchange_id,
      VolumeRecordType.DEPOSIT,
      VolumeRecordPeriod.MONTH,
      moment(ts).add(-1, 'month').toDate()
    );

    let maxVolume = await this.volumeRecordsTrackerService.getMaxVolumesById(
      message.detail.exchange_id,
      VolumeRecordType.DEPOSIT,
      VolumeRecordPeriod.MONTH,
      ts
    );

    if (maxVolume > 0 && volume > maxVolume) {
      await this.eventbridgeService.publish('DepositMonthVolumeRecord', {
        exchange_id: message.detail.exchange_id,
        volume: monthVolume,
        period: 'ALL',
        date: this.volumeRecordsTrackerService.formatDate(ts, VolumeRecordPeriod.MONTH),
        ts: moment(ts).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
      });
    }

    if (previousMonthVolume > 0 && volume > previousMonthVolume) {
      await this.eventbridgeService.publish('DepositMonthVolumeRecord', {
        exchange_id: message.detail.exchange_id,
        volume: monthVolume,
        period: 'PREVIOUS',
        date: this.volumeRecordsTrackerService.formatDate(ts, VolumeRecordPeriod.MONTH),
        ts: moment(ts).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
      });
    }

  }

  async getUsdVolume(exchange_id: string, currency: string, quantity: number) {
    if (currency == 'USD') return quantity;
    let exchange = await this.exchangeService.getByIdThruCache(exchange_id);
    if (!exchange) {
      throw new Error(`Exchange not found ${exchange_id}`);
    }
    let quoteInstrument = currency + 'USD';
    let quote;
    try {
      quote = await exchange.getQuoteForInstrumentThruCache(quoteInstrument);
    } catch (e) {
      throw new Error(`Quote not found for ${exchange_id} / ${quoteInstrument}`);
    }

    return quantity * quote.bid;
  }
}
