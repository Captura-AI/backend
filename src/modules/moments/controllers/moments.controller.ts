// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { ParamIdDto } from '../../../common/dtos/param-id.dto';
import { SearchByPlateDto } from '../dtos/search-by-plate.dto';
import { SearchMomentDto } from '../dtos/search-moment.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';
import { MomentLicenseEntity } from '../entities/moment-license.entity';

// NestJS Libraries
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

// Services
import { MomentsService } from '../services/moments.service';
import { PlateService } from '../../plate/services/plate.service';

const MOMENTS_RETRIEVED_MESSAGE = 'Moments retrieved successfully';

@Controller('moments')
@ApiTags('Moments')
export class MomentsController {
  constructor(
    private readonly _momentsService: MomentsService,
    private readonly _plateService: PlateService,
  ) {}

  @Post('search')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Search moments with combined filters (location, time, vehicle, plate)',
  })
  @ApiBaseResponse(MomentEntity)
  public async search(@Body() body: SearchMomentDto) {
    const result = await this._momentsService.search(body);

    return {
      message: MOMENTS_RETRIEVED_MESSAGE,
      result,
    };
  }

  @Get('search/plate')
  @ApiOperation({
    summary: "Find moments by license plate (fuzzy 'close enough' match)",
    description:
      'Matches the plate via trigram similarity to tolerate imperfect OCR, optionally boosted/filtered by motor type and color. Returns moments ranked by match score.',
  })
  @ApiBaseResponse(MomentEntity)
  public async searchByPlate(@Query() query: SearchByPlateDto) {
    const result = await this._momentsService.findByVehicle({
      color: query.color ?? null,
      limit: query.limit,
      motorType: query.motorType ?? null,
      plate: query.plate ?? null,
      threshold: query.threshold,
    });

    return {
      message: MOMENTS_RETRIEVED_MESSAGE,
      result,
    };
  }

  @Post('search/plate-photo')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Find moments by uploading a photo of the vehicle',
    description:
      'Reads the plate + motor type + color from the uploaded photo (AI), then fuzzy-matches moments by plate, ranked/filtered by type and color.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { format: 'binary', type: 'string' } },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  public async searchByPhoto(
    @Query() query: SearchByPlateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    const extracted = await this._plateService.extract(file);
    const detectedPlate = extracted.plates[0] ?? null;
    const dominantMotor = extracted.motors[0] ?? null;

    const moments = await this._momentsService.findByVehicle({
      color: dominantMotor?.color ?? null,
      limit: query.limit,
      motorType: dominantMotor?.motorType ?? null,
      plate: detectedPlate,
      threshold: query.threshold,
    });

    return {
      message: MOMENTS_RETRIEVED_MESSAGE,
      result: {
        detected: {
          color: dominantMotor?.color ?? null,
          motorType: dominantMotor?.motorType ?? null,
          plate: detectedPlate,
        },
        moments,
      },
    };
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get most recent moments' })
  @ApiBaseResponse(MomentEntity)
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of moments to return (default: 10)',
  })
  public async findRecent(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(Number(limit), 100) : 10;
    const result = await this._momentsService.findRecent(parsedLimit);

    return {
      message: 'Recent moments retrieved successfully',
      result,
    };
  }

  @Get('facets')
  @ApiOperation({ summary: 'Get facet suggestions: popular cities and vehicle type counts' })
  public async getFacets() {
    const result = await this._momentsService.getFacets();

    return {
      message: 'Facets retrieved successfully',
      result,
    };
  }

  // ─── Sub-resource routes must come before `:id` to avoid routing conflicts ───

  @Get(':id/similar')
  @ApiOperation({
    summary: 'Get similar moments based on location and vehicle type',
    description:
      'Returns moments from the same city or matching vehicle type. Phase 2 will use AI embedding similarity.',
  })
  @ApiBaseResponse(MomentEntity)
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of similar moments to return (default: 10, max: 50)',
  })
  public async findSimilar(@Param() params: ParamIdDto, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(Number(limit), 50) : 10;
    const result = await this._momentsService.findSimilar(params.id, parsedLimit);

    return {
      message: 'Similar moments retrieved successfully',
      result,
    };
  }

  @Get(':id/licenses')
  @ApiOperation({
    summary: 'Get available licenses for a moment',
    description: 'Returns all active licensing options with pricing for the specified moment.',
  })
  @ApiBaseResponse(MomentLicenseEntity)
  public async findLicenses(@Param() params: ParamIdDto) {
    const result = await this._momentsService.findLicensesByMomentId(params.id);

    return {
      message: 'Moment licenses retrieved successfully',
      result,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get full detail of a single moment',
    description:
      'Returns complete moment data including photographer profile, AI analysis, licenses, and metadata.',
  })
  @ApiBaseResponse(MomentEntity)
  public async findOneById(@Param() params: ParamIdDto) {
    const result = await this._momentsService.findOneById(params.id);

    return {
      message: 'Moment retrieved successfully',
      result,
    };
  }
}
