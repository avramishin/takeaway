import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { OpenOrderArgs } from './dto/open-order.args';
import { Order, OrderStatusEnum } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { CancelOrderArgs } from './dto/cancel-order.args';
import { RequestPagerArgs } from '../common/dto/request-pager.dto';
import { ClosedOrdersPaged } from './dto/closed-orders-paged';

@Resolver(() => Order)
export class OrdersResolver {
  constructor(private ordersService: OrdersService) {}

  @Query(() => [Order])
  @UseGuards(JwtGuard)
  async getOpenOrders(@CurrentUser() user: CurrentUserDto) {
    return await this.ordersService.findByUserId(user.id);
  }

  @Query(() => ClosedOrdersPaged)
  @UseGuards(JwtGuard)
  async getClosedOrders(
    @CurrentUser() user: CurrentUserDto,
    @Args() pager: RequestPagerArgs,
  ): Promise<ClosedOrdersPaged> {
    const [items, total] = await this.ordersService.findClosedOrders(
      user.id,
      pager,
    );

    return { items, total };
  }

  @Mutation(() => Order)
  @UseGuards(JwtGuard)
  async openOrder(
    @CurrentUser() user: CurrentUserDto,
    @Args() openOrder: OpenOrderArgs,
  ) {
    return await this.ordersService.openOrder(user.id, openOrder);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtGuard)
  async cancelOrder(
    @CurrentUser() user: CurrentUserDto,
    @Args() cancelOrder: CancelOrderArgs,
  ) {
    await this.ordersService.closeOrder({
      id: cancelOrder.id,
      status: OrderStatusEnum.cancelled,
      message: cancelOrder.message,
    });
    return true;
  }
}
