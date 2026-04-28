// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { ParamIdDto } from '../../../common/dtos/param-id.dto';
import { SearchMomentDto } from '../dtos/search-moment.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';

// NestJS Libraries
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

// Services
import { MomentsService } from '../services/moments.service';

@Controller('moments')
@ApiTags('Moments')
export class MomentsController {
  constructor(private readonly _momentsService: MomentsService) {}

  @Post('search')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Search moments with combined filters (location, time, vehicle, plate)',
  })
  @ApiBaseResponse(MomentEntity)
  public async search(@Body() body: SearchMomentDto) {
    const result = await this._momentsService.search(body);

    return {
      message: 'Moments retrieved successfully',
      result,
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single moment by ID' })
  @ApiBaseResponse(MomentEntity)
  public async findOneById(@Param() params: ParamIdDto) {
    const result = await this._momentsService.findOneById(params.id);

    return {
      message: 'Moment retrieved successfully',
      result,
    };
  }
}
