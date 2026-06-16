// Configuration Modules
import { AppConfigurationModule } from '../../configurations/app/app-configuration.module';
import { MailConfigModule } from '../../configurations/mail/mail-configuration.module';

// Controllers
import { DownloadsController } from './controllers/downloads.controller';
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
import { OrderReceiptMailService } from './services/order-receipt-mail.service';
import { OrdersService } from './services/orders.service';

@Module({
  controllers: [DownloadsController, OrdersController, WebhooksController],
  exports: [OrdersService],
  imports: [
    TypeOrmModule.forFeature([MomentEntity, MomentLicenseEntity, OrderEntity, OrderItemEntity]),
    AppConfigurationModule,
    MailConfigModule,
  ],
  providers: [MidtransService, OrderReceiptMailService, OrdersService],
})
export class OrdersModule {}
