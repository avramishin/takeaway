import { Field, Float, ArgsType } from '@nestjs/graphql';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { CurrencyTypeEnum } from '../currency.entity';

@ArgsType()
export class CreateCurrencyArgs {
  @Field()
  @IsNotEmpty()
  id: string;

  @Field(() => CurrencyTypeEnum)
  @IsNotEmpty()
  @IsEnum(CurrencyTypeEnum)
  type: CurrencyTypeEnum;

  @Field(() => Float)
  @IsNotEmpty()
  precission: number;
}
