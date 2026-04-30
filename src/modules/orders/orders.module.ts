// Configuration Modules
import { AppConfigurationModule } from '../../configurations/app/app-configuration.module';

// Controllers
import { OrdersController } from './controllers/orders.controller';
import { WebhooksController } from './controllers/webhooks.controller';

// Entities
import { MomentEntity } from '../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../moments/entities/moment-license.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';

// Providers
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { MidtransService } from './services/midtrans.service';
import { OrdersService } from './services/orders.service';

@Module({
  controllers: [OrdersController, WebhooksController],
  exports: [OrdersService],
  imports: [
    TypeOrmModule.forFeature([MomentEntity, MomentLicenseEntity, OrderEntity, OrderItemEntity]),
    AppConfigurationModule,
  ],
  providers: [MidtransService, OrdersService],
})
export class OrdersModule {}
