import { Entity, Column, PrimaryColumn } from 'typeorm';
import { Field, ObjectType, Float, registerEnumType } from '@nestjs/graphql';
import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';

export type CurrencyType = 'fiat' | 'crypto';
export enum CurrencyTypeEnum {
  'fiat' = 'fiat',
  'crypto' = 'crypto',
}

registerEnumType(CurrencyTypeEnum, {
  name: 'CurrencyTypeEnum',
});

@Entity({ name: 'currencies' })
@ObjectType()
export class Currency {
  @PrimaryColumn({ type: 'varchar', length: 15 })
  @Field({ nullable: false })
  id: string;

  @Column({ type: 'enum', enum: ['fiat', 'crypto'], nullable: false })
  @Field(() => CurrencyTypeEnum)
  type: CurrencyType;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  precission: number;

  precise(value: number) {
    return Number(value.toFixed(this.precission));
  }
}
