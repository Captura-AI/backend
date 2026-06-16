// NestJS Libraries
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param } from '@nestjs/common';

// Services
import { HotspotsService } from '../services/hotspots.service';

@Controller('hotspots')
@ApiTags('Hotspots')
export class HotspotsController {
  constructor(private readonly _hotspotsService: HotspotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the public hotspot map with live activity stats' })
  public async findHotspotPage() {
    const result = await this._hotspotsService.findHotspotPage();

    return {
      message: 'Hotspot map retrieved successfully',
      result,
    };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a public hotspot detail by slug' })
  public async findBySlug(@Param('slug') slug: string) {
    const result = await this._hotspotsService.findHotspotDetailBySlug(slug);

    return {
      message: 'Hotspot detail retrieved successfully',
      result,
    };
  }
}
