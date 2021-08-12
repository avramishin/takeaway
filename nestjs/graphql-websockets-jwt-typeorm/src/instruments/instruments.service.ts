import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Instrument } from './entities/instrument.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class InstrumentsService {
  constructor(
    private eventEmiter: EventEmitter2,
    @InjectRepository(Instrument) private instruments: Repository<Instrument>,
  ) {}

  /**
   * Insert instrument
   */
  async insertInstrument(instrument: Instrument) {
    await this.instruments.insert(instrument);
    return this.eventEmiter.emitAsync('instrument.created', { instrument });
  }

  /**
   * Delete instrument
   */
  async deleteInstrument(instrument: Instrument) {
    await this.instruments.delete(instrument);
    return this.eventEmiter.emitAsync('instrument.deleted', { instrument });
  }

  async findById(id: string) {
    return await this.instruments.findOne({ id });
  }

  async findByIdOrFail(id: string) {
    return await this.instruments.findOneOrFail({ id });
  }

  async findByCurrencies(base_currency: string, quote_currency: string) {
    return await this.instruments.findOne({
      base_currency,
      quote_currency,
    });
  }

  async findAll() {
    return await this.instruments.find();
  }
}
