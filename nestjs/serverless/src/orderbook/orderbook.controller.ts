import { Get, Controller, Param, BadRequestException } from '@nestjs/common';
import { OrderbookService } from './orderbook.service';
import { ExchangeService } from '../exchange/exchange.service';

@Controller('v1/orderbook')
export class OrderbookController {
  constructor(
    private orderbookService: OrderbookService,
    private exchangeService: ExchangeService,
  ) {}

  @Get('snapshot/:exchange/:instrument')
  async getOrder(
    @Param('exchange') exchangeId: string,
    @Param('instrument') instumentId: string,
  ) {
    try {
      const exchange = await this.exchangeService.getById(exchangeId);
      const orderbook = await this.orderbookService.getOrderbook(
        exchange,
        instumentId,
      );
      return {
        sell: orderbook.getSellSide(),
        buy: orderbook.getBuySide(),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
