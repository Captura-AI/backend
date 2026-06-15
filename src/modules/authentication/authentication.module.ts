// Controllers
import { AuthenticationController } from './controllers/authentication.controller';

// Interfaces
import { OTP_SENDER } from './interfaces/otp-sender.interface';

// Types
import type ms from 'ms';
import type { Provider } from '@nestjs/common';

// Modules
import { AppleConfigModule } from '../../configurations/apple/apple-configuration.module';
import { FonnteConfigModule } from '../../configurations/fonnte/fonnte-configuration.module';
import { GoogleConfigModule } from '../../configurations/google/google-configuration.module';
import { JwtConfigModule } from '../../configurations/jwt/jwt-configuration.module';
import { MailConfigModule } from '../../configurations/mail/mail-configuration.module';
import { RedisProviderModule } from '../../database/redis/redis-provider.module';
import { UsersModule } from '../users/users.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Services
import { AuthenticationService } from './services/authentication.service';
import { FonnteOtpSenderService } from './services/fonnte-otp-sender.service';
import { JwtConfigService } from '../../configurations/jwt/jwt-configuration.service';
import { MailSenderService } from './services/mail-sender.service';
import { MagicLinkService } from './services/magic-link.service';
import { OtpService } from './services/otp.service';

// Strategies
import { AppleStrategy } from '../../common/strategies/apple.strategy';
import { GoogleStrategy } from '../../common/strategies/google.strategy';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { LocalStrategy } from '../../common/strategies/local.strategy';

const ssoProviders: Provider[] = [
  GoogleStrategy,
  ...(process.env.APPLE_CLIENT_ID ? [AppleStrategy] : []),
];

@Module({
  imports: [
    AppleConfigModule,
    FonnteConfigModule,
    GoogleConfigModule,
    JwtConfigModule,
    MailConfigModule,
    PassportModule,
    RedisProviderModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [JwtConfigModule],
      useFactory: (configService: JwtConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: {
          expiresIn: configService.jwtExp as ms.StringValue,
          issuer: configService.jwtIssuer,
        },
      }),
      inject: [JwtConfigService],
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    ...ssoProviders,
    AuthenticationService,
    FonnteOtpSenderService,
    JwtStrategy,
    LocalStrategy,
    MailSenderService,
    MagicLinkService,
    OtpService,
    {
      provide: OTP_SENDER,
      useClass: FonnteOtpSenderService,
    },
  ],
})
export class AuthenticationModule {}
