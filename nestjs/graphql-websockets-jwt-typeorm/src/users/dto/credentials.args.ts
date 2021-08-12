import { IsNotEmpty } from 'class-validator';
import { Field, ArgsType } from '@nestjs/graphql';

@ArgsType()
export class CredentialsArgs {
  @IsNotEmpty()
  @Field()
  username: string;

  @IsNotEmpty()
  @Field()
  password: string;
}
