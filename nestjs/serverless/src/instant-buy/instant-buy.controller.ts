import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../user/user.model';

import { CreateInstantBuy } from './dto/create-instant-buy.dto';
import { EstimateInstantBuy } from './dto/estimate-instant-buy.dto';
import { InstantBuyPagedFilter } from './dto/instant-buy-paged-filter.dto';
import { GetSchema } from './dto/get-schema.dto';

import { InstantBuyService } from './instant-buy.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('v1/instant-buy')
@ApiBearerAuth('accessToken')
export class InstantBuyController {
  constructor(private instantBuyService: InstantBuyService) {}
  @Post()
  @UseGuards(AuthGuard)
  createOrder(@Body() instantBuy: CreateInstantBuy, @Req() req: any) {
    return this.instantBuyService.createOrder(instantBuy, req.user as User);
  }

  @Post('estimate')
  @UseGuards(AuthGuard)
  estimateOrder(@Body() instantBuy: EstimateInstantBuy, @Req() req: any) {
    return this.instantBuyService.estimateOrder(instantBuy, req.user as User);
  }

  @Get('order/:id')
  @UseGuards(AuthGuard)
  getById(@Param('id') id: string) {
    return this.instantBuyService.getById(id);
  }

  @Get('orders')
  @UseGuards(AuthGuard)
  getOrders(@Query() pagedFilter: InstantBuyPagedFilter, @Req() req: any) {
    return this.instantBuyService.getOrders(pagedFilter, req.user as User);
  }

  @Get('schemas')
  @UseGuards(AuthGuard)
  getSchemas(@Query() schemaDto: GetSchema, @Req() req: any) {
    return this.instantBuyService.getSchemas(schemaDto, req.user as User);
  }
}
