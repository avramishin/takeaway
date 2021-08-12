import { Args, Query, Resolver } from '@nestjs/graphql';
import { Orderbook } from './orderbook';
import { OrderbooksService } from './orderbooks.service';

@Resolver(() => Orderbook)
export class OrderbooksResolver {
  constructor(private orderbooksService: OrderbooksService) {}

  @Query(() => [Orderbook])
  getOrderbooks(
    @Args('instruments', { type: () => [String] }) instruments: [string],
  ) {
    return instruments.map((instrument) =>
      this.orderbooksService.getOrderbook(instrument),
    );
  }
}
