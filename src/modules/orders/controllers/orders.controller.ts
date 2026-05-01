// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// DTOs
import { CheckoutRequestDto } from '../dtos/checkout-request.dto';
import { ListOrdersDto } from '../dtos/list-orders.dto';
import { ParamIdDto } from '../../../common/dtos/param-id.dto';

// Entities
import { OrderEntity } from '../entities/order.entity';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';

// NestJS Libraries
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';

// Services
import { OrdersService } from '../services/orders.service';

@Controller()
@ApiTags('Orders & Checkout')
export class OrdersController {
  constructor(private readonly _ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(201)
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create order & initiate payment',
    description:
      'Creates a PENDING order, calculates pricing (subtotal + 5% service fee + 11% PPN), and returns a Midtrans Snap token for the frontend payment popup.',
  })
  @ApiBaseResponse(OrderEntity)
  public async checkout(@CurrentUser() user: IRequestUser, @Body() body: CheckoutRequestDto) {
    const result = await this._ordersService.checkout(user.id, body);

    return {
      message: 'Checkout initiated successfully',
      result,
    };
  }

  @Get('orders/me')
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my orders' })
  @ApiBaseResponse(OrderEntity)
  public async findMyOrders(@CurrentUser() user: IRequestUser, @Query() query: ListOrdersDto) {
    const result = await this._ordersService.findMyOrders(user.id, query);

    return {
      message: 'Orders retrieved successfully',
      result,
    };
  }

  @Get('orders/:id')
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID (owner only)' })
  @ApiBaseResponse(OrderEntity)
  public async findById(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    const result = await this._ordersService.findOrderById(params.id, user.id);

    return {
      message: 'Order retrieved successfully',
      result,
    };
  }

  @Post('orders/:id/cancel')
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending order' })
  @ApiBaseResponse(OrderEntity)
  public async cancel(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    const result = await this._ordersService.cancelOrder(params.id, user.id);

    return {
      message: 'Order cancelled successfully',
      result,
    };
  }

  @Get('orders/:id/download')
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get download URL for a purchased moment',
    description:
      'Returns a time-limited download URL for the original image of a PAID order. Only the order owner can access this endpoint.',
  })
  public async download(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    const result = await this._ordersService.generateDownloadUrl(params.id, user.id);

    return {
      message: 'Download URL generated successfully',
      result,
    };
  }
}
