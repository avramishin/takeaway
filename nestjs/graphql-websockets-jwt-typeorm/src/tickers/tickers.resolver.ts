import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ticker } from './ticker';
import { TickersService } from './tickers.service';

@Resolver(() => Ticker)
export class TickersResolver {
  constructor(private tickersService: TickersService) {}

  @Query(() => [Ticker])
  getTickers(
    @Args('instruments', { type: () => [String] }) instruments: [string],
  ) {
    return instruments.map((instrument) =>
      this.tickersService.getTicker(instrument),
    );
  }
}
