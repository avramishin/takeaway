import { Test, TestingModule } from '@nestjs/testing';
import { DynamoService } from '../dynamo/dynamo.service';
import { ClosedOrderDto } from './dto/order-closed.dto';
import { TradesTrackerService } from './trades-tracker.service';
import { VolumeRecordPeriod, VolumeRecordsTickerService, VolumeRecordType } from './volume-records-tracker.service';
import { ExchangeService } from '../exchange/exchange.service';
import { CacheService } from '../cache/cache.service';
import { EventbridgeService } from '../eventbridge/eventbridge.service';

const loggerMock = jest.fn((data: any) => {
  console.log(data);
});

describe('TradesTracker', () => {
  let service: TradesTrackerService;
  let volumeService: VolumeRecordsTickerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradesTrackerService,
        VolumeRecordsTickerService,
        {
          provide: ExchangeService,
          useValue: {
            getByIdThruCache: (exchange_id) => {
              return {
                getQuoteForInstrumentThruCache: (quoteInstrument) => {
                  return {
                    bid: 10,
                  };
                },
                getInstrumentsThruCache: () => {
                  return [{
                    id: 'ETHUSDT',
                    base_instrument: 'ETH',
                    quote_instrument: 'USDT',
                  }];
                }
              }
            }
          }
        },
        CacheService,
        DynamoService,
        {
          provide: EventbridgeService,
          useValue: {
            publish: (detailType: string, detail: any) => {
              console.log(detailType, detail);
            }
          }
        },
        {
          provide: 'Logger',
          useValue: {
            error: loggerMock
          }
        }
      ],
    }).compile();

    service = module.get<TradesTrackerService>(TradesTrackerService);
    volumeService = module.get<VolumeRecordsTickerService>(VolumeRecordsTickerService);
  });

  it('order closed test', async () => {
    const message = {
      "version": "0",
      "id": "123",
      "detail-type": "OrderClosed",
      "source": "trade_service",
      "account": "640848491082",
      "time": "2021-03-10T11:21:51Z",
      "region": "us-east-1",
      "resources": [],
      "detail": {
        "id": "123",
        "exchange_id": "SHIFTUATSTAGING",
        "oms_user_id": "123",
        "oms": "deltix",
        "client_user_id": "123",
        "close_time": 1615769488000,
        "open_time": 1615769480238,
        "instrument_id": "ETHUSDT",
        "type": "market",
        "side": "buy",
        "status": "completely_filled",
        "quantity": 0.066,
        "executed_quantity": 0.066,
        "time_in_force": "fok",
        "average_price": 1817.25502,
        "client_user_id_filled": "123",
        "client_user_id_status": "123"
      }
    };

    let ts = new Date(message.detail.close_time);

    let dayVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.DAY,
      ts
    );

    let weekVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.WEEK,
      ts
    );

    let monthVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.MONTH,
      ts
    );

    await service.process((message as unknown) as ClosedOrderDto);

    let newDayVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.DAY,
      ts
    );

    let newWeekVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.WEEK,
      ts
    );

    let newMonthVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.TRADE,
      VolumeRecordPeriod.MONTH,
      ts
    );

    expect(newDayVolume).toBeGreaterThan(dayVolume);
    expect(newWeekVolume).toBeGreaterThan(weekVolume);
    expect(newMonthVolume).toBeGreaterThan(monthVolume);

  }, 20000);
});
