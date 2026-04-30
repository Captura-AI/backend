// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// DTOs
import { CreateMomentDto } from '../../moments/dtos/create-moment.dto';
import { ListMyMomentsDto } from '../../moments/dtos/list-my-moments.dto';
import { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';
import { ParamIdDto } from '../../../common/dtos/param-id.dto';
import { UpdateMomentDto } from '../../moments/dtos/update-moment.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';

// Guards
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
}
