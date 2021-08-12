import { ArgsType, PartialType } from '@nestjs/graphql';
import { CreateCurrencyArgs } from './create-currency.args';

@ArgsType()
export class UpdateCurrencyArgs extends PartialType(CreateCurrencyArgs) {}
