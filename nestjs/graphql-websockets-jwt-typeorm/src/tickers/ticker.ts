import { Field, ObjectType, Float } from '@nestjs/graphql';

@ObjectType()
export class Ticker {
  @Field()
  public instrument: string;

  @Field(() => Float, { nullable: true })
  public ask?: number;

  @Field(() => Float, { nullable: true })
  public bid?: number;

  @Field(() => Date)
  public timestamp = new Date();
}
