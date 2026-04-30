// Entities
import { LicenseTypeEntity } from './entities/license-type.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { LicenseTypesController } from './controllers/license-types.controller';

// Services
import { LicenseTypesService } from './services/license-types.service';

@Module({
  controllers: [LicenseTypesController],
  exports: [LicenseTypesService],
  imports: [TypeOrmModule.forFeature([LicenseTypeEntity])],
  providers: [LicenseTypesService],
})
export class LicenseTypesModule {}
