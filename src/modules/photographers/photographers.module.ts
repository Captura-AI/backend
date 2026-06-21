// Entities
import { MomentEntity } from '../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../moments/entities/moment-license.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { PhotographerPackageEntity } from './entities/photographer-package.entity';
import { PhotographerProfileEntity } from './entities/photographer-profile.entity';
import { PhotographerReviewEntity } from './entities/photographer-review.entity';

// Modules
import { PlateModule } from '../plate/plate.module';
import { AppConfigurationModule } from '../../configurations/app/app-configuration.module';
import { UsersModule } from '../users/users.module';

// Services
import { AiAnalysisService } from '../moments/services/ai-analysis.service';

// Multer
import type { Request } from 'express';
import type { StorageEngine } from 'multer';
import { diskStorage } from 'multer';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { PhotographersController } from './controllers/photographers.controller';

// Services
import { PhotographersService } from './services/photographers.service';

type MulterFilterCallback = (error: Error | null, acceptFile: boolean) => void;

const momentStorage: StorageEngine = diskStorage({
  destination: './uploads/moments',
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => cb(null, `${Date.now()}-${file.originalname}`),
});

const momentFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: MulterFilterCallback,
): void => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

@Module({
  controllers: [PhotographersController],
  exports: [PhotographersService],
  imports: [
    TypeOrmModule.forFeature([
      MomentEntity,
      MomentLicenseEntity,
      OrderEntity,
      PhotographerPackageEntity,
      PhotographerProfileEntity,
      PhotographerReviewEntity,
    ]),
    MulterModule.register({
      fileFilter: momentFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
      storage: momentStorage,
    }),
    PlateModule,
    AppConfigurationModule,
    UsersModule,
  ],
  providers: [AiAnalysisService, PhotographersService],
})
export class PhotographersModule {}
