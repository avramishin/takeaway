import { IsOptional } from 'class-validator';
import { Field, ArgsType, Int } from '@nestjs/graphql';

@ArgsType()
export class RequestPagerArgs {
  @IsOptional()
  @Field(() => Int, { nullable: true, defaultValue: 30 })
  limit = 30;

  @IsOptional()
  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset = 0;
}
