import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { PlateConfirmDto, PlateConfirmResponseDto } from '../dtos/plate-confirm.dto';
import { PlateScanResponseDto } from '../dtos/plate-scan.dto';
import { PlateService } from '../services/plate.service';

@Controller('plate')
@ApiTags('Plate')
export class PlateController {
  constructor(private readonly _plateService: PlateService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan an image for a license plate via AI service' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'uploader_id', required: true, type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { format: 'binary', type: 'string' } },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  public async scan(
    @Query('uploader_id') uploaderId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; result: PlateScanResponseDto }> {
    if (!uploaderId?.trim()) {
      throw new BadRequestException('uploader_id is required.');
    }

    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    const result = await this._plateService.scan(uploaderId.trim(), file);

    return { message: 'Plate scan completed.', result };
  }

  @Post('confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save or discard a previous plate scan via AI service' })
  public async confirm(
    @Body() body: PlateConfirmDto,
  ): Promise<{ message: string; result: PlateConfirmResponseDto }> {
    const result = await this._plateService.confirm(body);

    return { message: 'Plate scan confirmation completed.', result };
  }
}
