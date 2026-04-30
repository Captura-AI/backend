// Interfaces
import type { IMidtransWebhookPayload } from '../interfaces/orders.interface';

// NestJS Libraries
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';

// Services
import { OrdersService } from '../services/orders.service';

@Controller('webhooks/payment')
@ApiTags('Webhooks')
export class WebhooksController {
  constructor(private readonly _ordersService: OrdersService) {}

  @Post('midtrans')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Handle Midtrans payment webhook',
    description:
      'Receives payment status notifications from Midtrans. No authentication required — signature is verified internally.',
  })
  public async handleMidtrans(@Body() payload: IMidtransWebhookPayload) {
    await this._ordersService.processWebhook(payload);

    return { message: 'Webhook processed successfully' };
  }
}
