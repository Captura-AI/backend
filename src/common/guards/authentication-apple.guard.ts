// NestJS Libraries
import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthenticationAppleGuard extends AuthGuard('apple-auth') {
  override canActivate(context: ExecutionContext) {
    if (!process.env.APPLE_CLIENT_ID) {
      throw new ServiceUnavailableException(
        'Apple authentication is not configured on this server',
      );
    }

    return super.canActivate(context);
  }
}
