import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Field, ObjectType, Float } from '@nestjs/graphql';
import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';
import { Account } from './account.entity';

@Entity({ name: 'accounts_transfers' })
@ObjectType()
export class AccountTransfer {
  @PrimaryColumn({ length: 36, type: 'varchar' })
  @Field()
  public id: string = uuid();

  @Column({ type: 'varchar', length: 36, nullable: false })
  @Index()
  public src_account_id: string;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  public src_account_balance_before: number;

  @Field(() => Account)
  src_account?: Account;

  @Column({ type: 'varchar', length: 36, nullable: false })
  @Index()
  public dst_account_id: string;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  public dst_account_balance_before: number;

  @Field(() => Account)
  dst_account?: Account;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  public amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  @Field()
  public description: string;

  @Column({ type: 'datetime', nullable: false })
  @Index()
  @Field(() => Date)
  public created_at = new Date();
}
