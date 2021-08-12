import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Currency } from './currency.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CurrenciesService {
  constructor(
    private eventEmiter: EventEmitter2,
    @InjectRepository(Currency) private currencies: Repository<Currency>,
  ) {}

  async findById(id: string) {
    return await this.currencies.findOne(id);
  }

  async findByIdOrFail(id: string) {
    return await this.currencies.findOneOrFail({ id });
  }

  async findAll() {
    return await this.currencies.find();
  }

  /**
   * Update currency
   */
  async updateCurrency(currency: Currency, fields: Partial<Currency>) {
    Object.assign(currency, fields);
    await this.currencies.save(currency);
    await this.eventEmiter.emitAsync('currency.updated', currency);
    return currency;
  }

  /**
   * Insert currency
   */
  async insertCurrency(currency: Currency) {
    await this.currencies.insert(currency);
    await this.eventEmiter.emitAsync('currency.created', currency);
    return currency;
  }

  /**
   * Delete currency
   */
  async deleteCurrency(currency: Currency) {
    await this.currencies.delete(currency);
    await this.eventEmiter.emitAsync('currency.deleted', currency);
    return currency;
  }
}
