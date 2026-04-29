// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// DTOs
import { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';
import { ParamIdDto } from '../../../common/dtos/param-id.dto';

// Entities
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';

// NestJS Libraries
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';

// Services
import { PhotographersService } from '../services/photographers.service';

@Controller('photographers')
@ApiTags('Photographers')
export class PhotographersController {
  constructor(private readonly _photographersService: PhotographersService) {}

  @Post('onboard')
  @HttpCode(200)
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Onboard current user as a photographer (instant approval)' })
  @ApiBaseResponse(PhotographerProfileEntity)
  public async onboard(@CurrentUser() user: IRequestUser, @Body() body: OnboardPhotographerDto) {
    const result = await this._photographersService.onboard(user.id, body);

    return {
      message: 'Successfully onboarded as photographer',
      result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public photographer profile by profile ID' })
  @ApiBaseResponse(PhotographerProfileEntity)
  public async findById(@Param() params: ParamIdDto) {
    const result = await this._photographersService.findById(params.id);

    return {
      message: 'Photographer profile retrieved successfully',
      result,
    };
  }
}
