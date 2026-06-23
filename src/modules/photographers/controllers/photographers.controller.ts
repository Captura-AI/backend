// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// DTOs
import { CreateMomentDto } from '../../moments/dtos/create-moment.dto';
import { ListPhotographersDto } from '../dtos/list-photographers.dto';
import { ListMyMomentsDto } from '../../moments/dtos/list-my-moments.dto';
import { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';
import { ParamIdDto } from '../../../common/dtos/param-id.dto';
import { UpdateMomentDto } from '../../moments/dtos/update-moment.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';

// Guards
import { AdminRoleGuard } from '../../../common/guards/admin-role.guard';
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { PhotographerRoleGuard } from '../../../common/guards/photographer-role.guard';

// NestJS Libraries
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

// Services
import { PhotographersService } from '../services/photographers.service';

const MOMENT_ID_ROUTE = 'moments/:id';

@Controller('photographers')
@ApiTags('Photographers')
export class PhotographersController {
  constructor(private readonly _photographersService: PhotographersService) {}

  @Get()
  @ApiOperation({ summary: 'List approved public photographer profiles' })
  public async findPublicDirectory(@Query() query: ListPhotographersDto) {
    const result = await this._photographersService.findPublicDirectory(query);

    return {
      message: 'Photographers retrieved successfully',
      result,
    };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get public photographer profile detail by slug' })
  public async findPublicBySlug(@Param('slug') slug: string) {
    const result = await this._photographersService.findPublicDetailBySlug(slug);

    return {
      message: 'Photographer detail retrieved successfully',
      result,
    };
  }

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

  @Get('me/earnings')
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get earnings summary for the authenticated photographer' })
  public async getEarningsSummary(@CurrentUser() user: IRequestUser) {
    const result = await this._photographersService.getEarningsSummary(user.id);

    return {
      message: 'Earnings summary retrieved successfully',
      result,
    };
  }

  @Get('me/earnings/history')
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated earnings history for the authenticated photographer' })
  public async getEarningsHistory(
    @CurrentUser() user: IRequestUser,
    @Query('limit') limit = 10,
    @Query('offset') offset = 1,
  ) {
    const result = await this._photographersService.getEarningsHistory(
      user.id,
      Number(limit),
      Number(offset),
    );

    return {
      message: 'Earnings history retrieved successfully',
      result,
    };
  }

  @Post('moments')
  @HttpCode(201)
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new moment (photographer only)' })
  @ApiBaseResponse(MomentEntity)
  @ApiBody({
    description: 'Moment data with optional image file',
    schema: {
      type: 'object',
      required: ['caption'],
      properties: {
        caption: { type: 'string' },
        cameraInfo: { type: 'string' },
        capturedAt: { type: 'number' },
        city: { type: 'string' },
        district: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        latitude: { type: 'number' },
        licensePlate: { type: 'string' },
        licenses: {
          type: 'string',
          description: 'JSON string array of license objects',
        },
        longitude: { type: 'number' },
        story: { type: 'string' },
        tags: { type: 'string', description: 'JSON string array of tags' },
        vehicleType: { type: 'string' },
      },
    },
  })
  public async createMoment(
    @CurrentUser() user: IRequestUser,
    @Body() body: CreateMomentDto,
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    const result = await this._photographersService.createMoment(user.id, body, imageFile);

    // Trigger AI analysis asynchronously — does not block the response
    this._photographersService.triggerAiAnalysis(result.id, result.imageUrl);

    return {
      message: 'Moment uploaded successfully',
      result,
    };
  }

  @Get('moments')
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List moments owned by the authenticated photographer (paginated)' })
  @ApiBaseResponse(MomentEntity)
  public async findMyMoments(@CurrentUser() user: IRequestUser, @Query() query: ListMyMomentsDto) {
    const result = await this._photographersService.findMyMoments(user.id, query);

    return {
      message: 'My moments retrieved successfully',
      result,
    };
  }

  @Get(MOMENT_ID_ROUTE)
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get detail of a specific moment owned by the authenticated photographer',
  })
  @ApiBaseResponse(MomentEntity)
  public async findMyMomentById(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    const result = await this._photographersService.findMyMomentById(user.id, params.id);

    return {
      message: 'Moment detail retrieved successfully',
      result,
    };
  }

  @Post('moments/:id/retry-analysis')
  @HttpCode(202)
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retry AI analysis for a failed moment owned by the authenticated photographer',
  })
  public async retryMomentAnalysis(@CurrentUser() user: IRequestUser, @Param() params: ParamIdDto) {
    await this._photographersService.retryMomentAnalysis(user.id, params.id);

    return { message: 'AI analysis re-queued' };
  }

  @Patch(MOMENT_ID_ROUTE)
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit a moment owned by the authenticated photographer' })
  @ApiBaseResponse(MomentEntity)
  public async updateMyMoment(
    @CurrentUser() user: IRequestUser,
    @Param() params: ParamIdDto,
    @Body() body: UpdateMomentDto,
  ) {
    const result = await this._photographersService.updateMyMoment(user.id, params.id, body);

    return {
      message: 'Moment updated successfully',
      result,
    };
  }

  @Delete(MOMENT_ID_ROUTE)
  @HttpCode(204)
  @UseGuards(PhotographerRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a moment owned by the authenticated photographer' })
  public async deleteMyMoment(
    @CurrentUser() user: IRequestUser,
    @Param() params: ParamIdDto,
  ): Promise<void> {
    await this._photographersService.deleteMyMoment(user.id, params.id);
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

  @Patch(':id/approve')
  @HttpCode(200)
  @UseGuards(AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a photographer profile (admin only)' })
  @ApiBaseResponse(PhotographerProfileEntity)
  public async approvePhotographer(@Param() params: ParamIdDto) {
    const result = await this._photographersService.approve(params.id);

    return {
      message: 'Photographer profile approved',
      result,
    };
  }

  @Patch(':id/reject')
  @HttpCode(200)
  @UseGuards(AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a photographer profile (admin only)' })
  @ApiBaseResponse(PhotographerProfileEntity)
  public async rejectPhotographer(@Param() params: ParamIdDto) {
    const result = await this._photographersService.reject(params.id);

    return {
      message: 'Photographer profile rejected',
      result,
    };
  }
}
