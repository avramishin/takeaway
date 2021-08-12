import { v4 as uuid } from 'uuid';
import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
@Entity({ name: 'orders_trades' })
export class OrderTrade {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id = uuid();

  @Column({ type: 'varchar', length: 36, nullable: false })
  @Index()
  sell_order_id: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  @Index()
  buy_order_id: string;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  price: number;

  @Column({ type: 'datetime', nullable: false })
  @Index()
  created_at = new Date();
}
