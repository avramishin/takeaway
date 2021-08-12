import { Entity, Column, PrimaryColumn } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { Account } from '../../accounts/entities/account.entity';

@Entity({ name: 'users' })
@ObjectType()
export class User {
  @PrimaryColumn({ length: 36 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  @Field()
  username: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  password_hash: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  broker_id: string;

  @Field(() => [Account], { nullable: true })
  accounts?: [Account];
}
