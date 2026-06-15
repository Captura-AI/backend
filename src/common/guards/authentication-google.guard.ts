// NestJS Libraries
import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Services
import { GoogleConfigService } from '../../configurations/google/google-configuration.service';

@Injectable()
export class AuthenticationGoogleGuard extends AuthGuard('google-auth') {
  constructor(private readonly _googleConfigService: GoogleConfigService) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isConfigured =
      this._googleConfigService.googleClientId &&
      this._googleConfigService.googleClientSecret &&
      this._googleConfigService.googleCallbackUrl;

    if (!isConfigured) {
      throw new ServiceUnavailableException(
        'Google authentication is not configured on this server',
      );
    }

    return super.canActivate(context);
  }
}
