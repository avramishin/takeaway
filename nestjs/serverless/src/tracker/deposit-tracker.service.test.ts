import moment from 'moment';
import { Test, TestingModule } from '@nestjs/testing';
import { DynamoService } from '../dynamo/dynamo.service';
import { VolumeRecordPeriod, VolumeRecordsTickerService, VolumeRecordType } from './volume-records-tracker.service';
import { ExchangeService } from '../exchange/exchange.service';
import { CacheService } from '../cache/cache.service';
import { EventbridgeService } from '../eventbridge/eventbridge.service';
import { DepositTrackerService } from './deposit-tracker.service';
import { DepositCompletedDto } from './dto/deposit-completed.dto';


describe('DepositsTracker', () => {
  let service: DepositTrackerService;
  let volumeService: VolumeRecordsTickerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositTrackerService,
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
        }
      ],
    }).compile();

    service = module.get<DepositTrackerService>(DepositTrackerService);
    volumeService = module.get<VolumeRecordsTickerService>(VolumeRecordsTickerService);
  });

  it('deposit complete test', async () => {
    const message = {
      "version": "0",
      "id": "123",
      "detail-type": "DepositCompleted",
      "source": "WalletIntegrationService_Dev",
      "account": "123",
      "time": "2021-03-10T11:06:29Z",
      "region": "us-east-1",
      "resources": [],
      "detail": {
        "id": "123",
        "type": "DEPOSIT",
        "exchange_id": "SHIFTUATSTAGING",
        "user_id": "123",
        "product_id": "ETH",
        "address": "123",
        "tag": null,
        "amount": "0.01",
        "confirmations_required": 2,
        "confirmations_count": 1,
        "status": "COMPLETED",
        "psp_service_id": "TEST",
        "revert_txid": null,
        "message": null,
        "exchange_txid": "123",
        "state_hash": "123",
        "created_at": "2021-03-14T11:06:28.000Z",
        "updated_at": "2021-03-15T11:06:28.000Z",
        "txid_hash": "123",
        "schema_name": null,
        "schema_data": null,
        "is_internal_transfer": 0,
        "internal_transfer_counter_id": null,
        "amount_check": "NOT_REQUIRED",
        "idm_check": "NOT_REQUIRED",
        "approved": 0,
        "duplicate": 0,
        "iframe_url": null,
        "validation": null,
        "details": null,
        "webhook_url": null,
        "reusable": null,
        "exchange": "NEXUS",
        "client_user_id": "123"
      }
    };

    let ts = moment(message.detail.updated_at).toDate();

    let monthVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.DEPOSIT,
      VolumeRecordPeriod.MONTH,
      ts
    );

    await service.process((message as unknown) as DepositCompletedDto);

    let newMonthVolume = await volumeService.getVolume(message.detail.exchange_id,
      VolumeRecordType.DEPOSIT,
      VolumeRecordPeriod.MONTH,
      ts
    );

    expect(newMonthVolume).toBeGreaterThan(monthVolume);
  }, 20000);

  it('deposit record event test', async () => {

    const message = {
      "version": "0",
      "id": "123",
      "detail-type": "DepositCompleted",
      "source": "WalletIntegrationService_Dev",
      "account": "123",
      "time": "2021-03-10T11:06:29Z",
      "region": "us-east-1",
      "resources": [],
      "detail": {
        "id": "123",
        "type": "DEPOSIT",
        "exchange_id": "SHIFTUATSTAGING",
        "user_id": "123",
        "product_id": "ETH",
        "address": "123",
        "tag": null,
        "amount": "0.001",
        "confirmations_required": 2,
        "confirmations_count": 1,
        "status": "COMPLETED",
        "psp_service_id": "TEST",
        "revert_txid": null,
        "message": null,
        "exchange_txid": "123",
        "state_hash": "123",
        "created_at": "2021-02-14T11:06:28.000Z",
        "updated_at": "2021-02-15T11:06:28.000Z",
        "txid_hash": "123",
        "schema_name": null,
        "schema_data": null,
        "is_internal_transfer": 0,
        "internal_transfer_counter_id": null,
        "amount_check": "NOT_REQUIRED",
        "idm_check": "NOT_REQUIRED",
        "approved": 0,
        "duplicate": 0,
        "iframe_url": null,
        "validation": null,
        "details": null,
        "webhook_url": null,
        "reusable": null,
        "exchange": "NEXUS",
        "client_user_id": "123"
      }
    };

    await service.process((message as unknown) as DepositCompletedDto);

    const message2 = {
      "version": "0",
      "id": "123",
      "detail-type": "DepositCompleted",
      "source": "WalletIntegrationService_Dev",
      "account": "123",
      "time": "2021-03-10T11:06:29Z",
      "region": "us-east-1",
      "resources": [],
      "detail": {
        "id": "123",
        "type": "DEPOSIT",
        "exchange_id": "SHIFTUATSTAGING",
        "user_id": "123",
        "product_id": "ETH",
        "address": "123",
        "tag": null,
        "amount": "0.01",
        "confirmations_required": 2,
        "confirmations_count": 1,
        "status": "COMPLETED",
        "psp_service_id": "TEST",
        "revert_txid": null,
        "message": null,
        "exchange_txid": "123",
        "state_hash": "123",
        "created_at": "2021-03-14T11:06:28.000Z",
        "updated_at": "2021-03-15T11:06:28.000Z",
        "txid_hash": "123",
        "schema_name": null,
        "schema_data": null,
        "is_internal_transfer": 0,
        "internal_transfer_counter_id": null,
        "amount_check": "NOT_REQUIRED",
        "idm_check": "NOT_REQUIRED",
        "approved": 0,
        "duplicate": 0,
        "iframe_url": null,
        "validation": null,
        "details": null,
        "webhook_url": null,
        "reusable": null,
        "exchange": "NEXUS",
        "client_user_id": "123"
      }
    };

    await service.process((message2 as unknown) as DepositCompletedDto);
  }, 20000);

});
