import { IsNotEmpty, IsOptional, Length } from 'class-validator';

import { Field, ArgsType } from '@nestjs/graphql';

@ArgsType()
export class CancelOrderArgs {
  @IsNotEmpty()
  @Field()
  id: string;

  @IsOptional()
  @Length(1, 255)
  @Field({ nullable: true, defaultValue: undefined })
  message?: string;
}
