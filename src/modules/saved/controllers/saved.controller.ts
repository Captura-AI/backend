// Decorators
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// DTOs
import { CreateSavedMomentDto } from '../dtos/create-saved-moment.dto';
import { CreateSavedSearchDto } from '../dtos/create-saved-search.dto';
import { ParamIdDto } from '../../../common/dtos/param-id.dto';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';

// NestJS Libraries
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

// Services
import { SavedService } from '../services/saved.service';

@Controller('saved')
@ApiTags('Saved')
@UseGuards(AuthenticationJWTGuard)
@ApiBearerAuth()
export class SavedController {
  constructor(private readonly _savedService: SavedService) {}

  @Get('moments')
  @ApiOperation({ summary: 'List the current user saved moments' })
  public async findSavedMoments(@CurrentUser() user: IRequestUser) {
    const result = await this._savedService.listSavedMoments(user.id);

    return {
      message: 'Saved moments retrieved successfully',
      result,
    };
  }

  @Post('moments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Bookmark a moment (idempotent)' })
  public async saveMoment(@CurrentUser() user: IRequestUser, @Body() body: CreateSavedMomentDto) {
    const result = await this._savedService.saveMoment(user.id, body.momentId);

    return {
      message: 'Moment saved successfully',
      result,
    };
  }

  @Delete('moments/:momentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a bookmarked moment' })
  public async removeSavedMoment(
    @CurrentUser() user: IRequestUser,
    @Param('momentId', ParseUUIDPipe) momentId: string,
  ): Promise<void> {
    await this._savedService.removeSavedMoment(user.id, momentId);
  }

  @Get('searches')
  @ApiOperation({ summary: 'List the current user saved searches' })
  public async findSavedSearches(@CurrentUser() user: IRequestUser) {
    const result = await this._savedService.listSavedSearches(user.id);

    return {
      message: 'Saved searches retrieved successfully',
      result,
    };
  }

  @Post('searches')
  @HttpCode(201)
  @ApiOperation({ summary: 'Save an Explorer search' })
  public async createSavedSearch(
    @CurrentUser() user: IRequestUser,
    @Body() body: CreateSavedSearchDto,
  ) {
    const result = await this._savedService.createSavedSearch(user.id, body);

    return {
      message: 'Search saved successfully',
      result,
    };
  }

  @Delete('searches/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a saved search' })
  public async removeSavedSearch(
    @CurrentUser() user: IRequestUser,
    @Param() params: ParamIdDto,
  ): Promise<void> {
    await this._savedService.removeSavedSearch(user.id, params.id);
  }
}
