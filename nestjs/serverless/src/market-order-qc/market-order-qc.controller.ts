import {
  Get,
  Query,
  Post,
  Body,
  Controller,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MarketOrderQcService } from './market-order-qc.service';
import { CreateMarketOrderQc } from './dto/create-market-order-qc.dto';
import { User } from '../user/user.model';
import { MarketOrderQcPagedFilter } from './dto/market-order-qc-paged-filter.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('v1/market-order-qc')
@ApiBearerAuth('accessToken')
export class MarketOrderQcController {
  constructor(private marketOrderQcService: MarketOrderQcService) {}

  @Post()
  @UseGuards(AuthGuard)
  createOrder(@Body() createOrderDto: CreateMarketOrderQc, @Req() req: any) {
    return this.marketOrderQcService.createOrder(
      createOrderDto,
      req.user as User,
    );
  }

  @Get('orders')
  @UseGuards(AuthGuard)
  getOrders(@Query() pagedFilter: MarketOrderQcPagedFilter, @Req() req: any) {
    return this.marketOrderQcService.getOrders(pagedFilter, req.user as User);
  }

  @Get('order/:id')
  @UseGuards(AuthGuard)
  getOrder(@Param('id') orderId: string) {
    return this.marketOrderQcService.getOrder(orderId);
  }
}
