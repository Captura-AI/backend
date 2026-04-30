// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// DTOs
import { CreateLicenseTypeDto } from '../dtos/create-license-type.dto';
import { ListLicenseTypesDto } from '../dtos/list-license-types.dto';
import { ParamIdDto } from '../../../common/dtos/param-id.dto';
import { UpdateLicenseTypeDto } from '../dtos/update-license-type.dto';

// Entities
import { LicenseTypeEntity } from '../entities/license-type.entity';

// Guards
import { AdminRoleGuard } from '../../../common/guards/admin-role.guard';

// NestJS Libraries
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  UseGuards,
} from '@nestjs/common';

// Services
import { LicenseTypesService } from '../services/license-types.service';

@Controller('license-types')
@ApiTags('License Types')
export class LicenseTypesController {
  constructor(private readonly _licenseTypesService: LicenseTypesService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new platform license type (admin only)' })
  @ApiBaseResponse(LicenseTypeEntity)
  public async create(@CurrentUser() _user: IRequestUser, @Body() body: CreateLicenseTypeDto) {
    const result = await this._licenseTypesService.create(body);

    return {
      message: 'License type created successfully',
      result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all active platform license types (public)' })
  @ApiBaseResponse(LicenseTypeEntity)
  public async findAll(@Query() query: ListLicenseTypesDto) {
    const result = await this._licenseTypesService.findAll(query);

    return {
      message: 'License types retrieved successfully',
      result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a platform license type by id (public)' })
  @ApiBaseResponse(LicenseTypeEntity)
  public async findById(@Param() params: ParamIdDto) {
    const result = await this._licenseTypesService.findById(params.id);

    return {
      message: 'License type retrieved successfully',
      result,
    };
  }

  @Patch(':id')
  @UseGuards(AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a platform license type (admin only)' })
  @ApiBaseResponse(LicenseTypeEntity)
  public async update(
    @CurrentUser() _user: IRequestUser,
    @Param() params: ParamIdDto,
    @Body() body: UpdateLicenseTypeDto,
  ) {
    const result = await this._licenseTypesService.update(params.id, body);

    return {
      message: 'License type updated successfully',
      result,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a platform license type (admin only)' })
  public async remove(
    @CurrentUser() _user: IRequestUser,
    @Param() params: ParamIdDto,
  ): Promise<void> {
    await this._licenseTypesService.remove(params.id);
  }
}
