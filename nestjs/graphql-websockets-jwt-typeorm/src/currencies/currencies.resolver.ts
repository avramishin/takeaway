import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CurrenciesService } from './currencies.service';
import { CurrencyException } from './currency.exception';
import { CreateCurrencyArgs } from './dto/create-currency.args';
import { UpdateCurrencyArgs } from './dto/update-currency.args';
import { Currency, CurrencyType } from './currency.entity';

@Resolver(() => Currency)
export class CurrenciesResolver {
  constructor(private currenciesService: CurrenciesService) {}

  @Query(() => [Currency])
  async getCurrencies() {
    return this.currenciesService.findAll();
  }

  @Mutation(() => String)
  async deleteCurrency(@Args('id') id: string) {
    await this.currenciesService.deleteCurrency(
      await this.currenciesService.findByIdOrFail(id),
    );
    return id;
  }

  @Mutation(() => Currency)
  async createCurrency(@Args() newCurrency: CreateCurrencyArgs) {
    const currencyExists = await this.currenciesService.findById(
      newCurrency.id,
    );

    if (currencyExists) {
      throw new CurrencyException('CURRENCY_EXISTS', {
        id: newCurrency.id,
      });
    }

    const currency = new Currency();
    currency.id = newCurrency.id;
    currency.precission = newCurrency.precission;
    currency.type = (newCurrency.type as unknown) as CurrencyType;

    return this.currenciesService.insertCurrency(currency);
  }

  @Mutation(() => Currency)
  async updateCurrency(@Args() updateCurrency: UpdateCurrencyArgs) {
    const currency = await this.currenciesService.findByIdOrFail(
      updateCurrency.id,
    );
    return this.currenciesService.updateCurrency(currency, updateCurrency);
  }
}
