// NestJS Libraries
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param } from '@nestjs/common';

// Services
import { OrdersService } from '../services/orders.service';

@Controller('download')
@ApiTags('Downloads')
export class DownloadsController {
  constructor(private readonly _ordersService: OrdersService) {}

  @Get(':token')
  @ApiOperation({
    summary: 'Download purchased moment using a download token',
    description:
      'Public endpoint — no JWT required. Returns a time-limited URL for the original image. The download token is a single-use UUID generated when the order is marked PAID.',
  })
  @ApiParam({ description: 'Download token from a PAID order', name: 'token' })
  public async downloadByToken(@Param('token') token: string) {
    const result = await this._ordersService.generateDownloadUrlByToken(token);

    return {
      message: 'Download URL generated successfully',
      result,
    };
  }
}
