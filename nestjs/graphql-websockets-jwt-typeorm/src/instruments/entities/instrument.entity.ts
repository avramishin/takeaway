import { Entity, Column, PrimaryColumn } from 'typeorm';
import { Field, ObjectType, Float } from '@nestjs/graphql';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';

@Entity({ name: 'instruments' })
@ObjectType()
export class Instrument {
  @PrimaryColumn({ type: 'varchar', length: 15 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 15, nullable: false })
  @Field()
  base_currency: string;

  @Column({ type: 'varchar', length: 15, nullable: false })
  @Field()
  quote_currency: string;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  quantity_increment: number;

  /**
   * Validate amount against quantity_increment
   * @param quantity
   */
  public isValidQuantity(quantity: number) {
    if (this.quantity_increment > quantity) {
      return false;
    }
    const div = Number((quantity / this.quantity_increment).toFixed(1));
    return div - Math.ceil(div) == 0;
  }
}
