import { Field, ObjectType, Float } from '@nestjs/graphql';
import { OrderSideEnum } from '../orders/entities/order.entity';

@ObjectType()
export class OrderbookItem {
  @Field(() => Float)
  quantity: number;

  @Field(() => Float)
  price: number;

  @Field(() => OrderSideEnum)
  side: OrderSideEnum;
}

@ObjectType()
export class Orderbook {
  @Field(() => [OrderbookItem])
  items: OrderbookItem[] = [];

  @Field()
  public instrument: string;

  @Field(() => Date)
  public timestamp = new Date();

  clear(): void {
    this.items = [];
  }

  /**
   * Batch update to items
   */
  update(items: OrderbookItem[]) {
    items.map(this.updateRow.bind(this));
  }

  /**
   * Update orderbook with incoming order
   */
  updateRow({ price, side, quantity }: OrderbookItem): void {
    const row = this.items.find((row) => {
      return row.side == side && row.price == price;
    });

    if (row) {
      if (quantity == 0) {
        this.items.splice(this.items.indexOf(row), 1);
      } else {
        row.quantity = quantity;
      }
    } else {
      if (quantity != 0) {
        this.items.push({ price, quantity, side });
      }
    }
  }

  /**
   * Get BUY side rows, sorted higher price first
   */
  getBuySide() {
    return (JSON.parse(JSON.stringify(this.items)) as OrderbookItem[])
      .filter((order) => order.side == OrderSideEnum.buy)
      .sort((a: OrderbookItem, b: OrderbookItem) => b.price - a.price);
  }

  /**
   * Get SELL side rows, sorted lower prices first
   */
  getSellSide() {
    return (JSON.parse(JSON.stringify(this.items)) as OrderbookItem[])
      .filter((order) => order.side == OrderSideEnum.sell)
      .sort((a: OrderbookItem, b: OrderbookItem) => a.price - b.price);
  }
}
