import { Resolver } from '@nestjs/graphql';
import { Instrument } from './entities/instrument.entity';

@Resolver(() => Instrument)
export class InstrumentsResolver {}
