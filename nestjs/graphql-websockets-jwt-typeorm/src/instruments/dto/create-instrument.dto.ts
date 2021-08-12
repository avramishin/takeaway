import { OmitType, PartialType } from '@nestjs/swagger';
import { Instrument } from '../entities/instrument.entity';

export class CreateInstrumentDto extends PartialType(
  OmitType(Instrument, ['id'] as const),
) {}
