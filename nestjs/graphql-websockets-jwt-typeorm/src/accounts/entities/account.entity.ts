import { v4 as uuid } from 'uuid';
import { Length, IsNotEmpty } from 'class-validator';
import { Entity, Column, PrimaryColumn } from 'typeorm';
import { Field, ObjectType, Float } from '@nestjs/graphql';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity({ name: 'accounts' })
@ObjectType()
export class Account {
  @IsNotEmpty()
  @PrimaryColumn({ length: 36 })
  @Field()
  id: string = uuid();

  @IsNotEmpty()
  @Column({ type: 'varchar', length: 15, nullable: false })
  @Field()
  currency: string;

  @IsNotEmpty()
  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
    default: 0,
  })
  @Field(() => Float)
  balance: number;

  @IsNotEmpty()
  @Length(36)
  @Column({ type: 'varchar', length: 36, nullable: false })
  @Field()
  user_id: string;
}
