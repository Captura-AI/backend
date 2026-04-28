// NestJS Libraries
import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthenticationGoogleGuard extends AuthGuard('google-auth') {
  override canActivate(context: ExecutionContext) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new ServiceUnavailableException(
        'Google authentication is not configured on this server',
      );
    }

    return super.canActivate(context);
  }
}
