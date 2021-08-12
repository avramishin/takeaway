import { AuthGuard as NestAuthGuard } from '@nestjs/passport';
import {
  Delete,
  Get,
  Query,
  Post,
  Body,
  Controller,
  Req,
  UseGuards,
  Param,
  Header,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

import {
  OrderPagedFilter,
  OrderPagedFilterCsv,
} from './dto/order-paged-filter.dto';
import {
  TransactionPagedFilter,
  TransactionPagedFilterCsv,
} from './dto/transaction-paged-filter.dto';

import {
  ActivityPagedFilter,
  ActivityPagedFilterCsv,
} from './dto/activity-paged-filter.dto';

import { CreateOrder } from './dto/create-order.dto';
import { TradeService } from './trade.service';
import { objectsToCsv } from '../helpers/objects-to-csv';
import { plainToClass } from 'class-transformer';
import { OrderCsv } from './dto/order-csv.dto';
import { User } from '../user/user.model';

import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Order } from './order.model';
import { OrderPagedResponse } from './dto/order-paged-response.dto';
import { Account } from './dto/account.dto';
import { OrderEvent } from './order-event.model';

@Controller('v1/trade')
@ApiBearerAuth('accessToken')
export class TradeController {
  constructor(private tradeService: TradeService) {}

  @Post('order')
  @ApiResponse({ status: 201, type: Order })
  @UseGuards(AuthGuard)
  createOrder(@Body() createOrderDto: CreateOrder, @Req() req: any) {
    try {
      return this.tradeService.createOrder(createOrderDto, req.user as User);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('orders/closed')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: OrderPagedResponse })
  getClosedOrders(@Query() orderFilter: OrderPagedFilter, @Req() req: any) {
    return this.tradeService.getClosedOrders(orderFilter, req.user as User);
  }

  @Get('orders/open')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: [Order] })
  getOpenOrders(@Req() req: any) {
    return this.tradeService.getOpenOrders(req.user as User);
  }

  @Get('accounts')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: [Account] })
  getAccounts(@Req() req: any) {
    return this.tradeService.getAccounts(req.user as User);
  }

  @Get('activity')
  @UseGuards(AuthGuard)
  getActivity(@Query() activityFilter: ActivityPagedFilter, @Req() req: any) {
    return this.tradeService.getActivity(activityFilter, req.user as User);
  }

  @Get('transactions')
  @UseGuards(AuthGuard)
  getTransactions(@Query() trxFilter: TransactionPagedFilter, @Req() req: any) {
    return this.tradeService.getTransactions(trxFilter, req.user as User);
  }

  @Get('orders/closed/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="orders.csv"')
  @UseGuards(AuthGuard)
  async getClosedOrdersCsv(
    @Query() orderFilter: OrderPagedFilterCsv,
    @Req() req: any,
  ) {
    const { items } = await this.tradeService.getClosedOrders(
      orderFilter,
      req.user as User,
    );
    return objectsToCsv(
      items.map(order => plainToClass(OrderCsv, order)),
      orderFilter.dateFormat,
      orderFilter.dateTimezone,
      orderFilter.headers,
    );
  }

  @Get('orders/open/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="orders.csv"')
  @UseGuards(AuthGuard)
  async getOpenOrdersCsv(
    @Query() orderFilter: OrderPagedFilterCsv,
    @Req() req: any,
  ) {
    const orders = await this.tradeService.getOpenOrders(req.user as User);
    return objectsToCsv(
      orders.map(order => plainToClass(OrderCsv, order)),
      orderFilter.dateFormat,
      orderFilter.dateTimezone,
      orderFilter.headers,
    );
  }

  @Get('transactions/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="transactions.csv"')
  @UseGuards(AuthGuard)
  async getTransactionsCsv(
    @Query() trxFilter: TransactionPagedFilterCsv,
    @Req() req: any,
  ) {
    const { items } = await this.tradeService.getTransactions(
      trxFilter,
      req.user as User,
    );
    return objectsToCsv(
      items,
      trxFilter.dateFormat,
      trxFilter.dateTimezone,
      trxFilter.headers,
    );
  }

  @Get('activity/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="activity.csv"')
  @UseGuards(AuthGuard)
  async getActivityCsv(
    @Query() filter: ActivityPagedFilterCsv,
    @Req() req: any,
  ) {
    const activity = await this.tradeService.getActivity(
      filter,
      req.user as User,
    );
    return objectsToCsv(
      activity,
      filter.dateFormat,
      filter.dateTimezone,
      filter.headers,
    );
  }

  @Get('order/:order_id')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: Order })
  getOrder(@Param('order_id') orderId: string, @Req() req: any) {
    return this.tradeService.getOrder(orderId, req.user as User);
  }

  @Get('order/:order_id/events')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, type: [OrderEvent] })
  getOrderEvents(@Param('order_id') orderId: string, @Req() req: any) {
    return this.tradeService.getOrderEvents(orderId /*, req.user as User*/);
  }

  @Delete('order/:order_id')
  @UseGuards(AuthGuard)
  cancelOrder(@Param('order_id') orderId: string, @Req() req: any) {
    return this.tradeService.cancelOrder(orderId, req.user as User);
  }
}
