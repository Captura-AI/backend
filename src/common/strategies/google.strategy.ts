// Entities
import type { UsersEntity } from '../../modules/users/entities/users.entity';

// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import type { Profile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy } from 'passport-google-oauth20';

// Services
import { GoogleConfigService } from '../../configurations/google/google-configuration.service';
import { UsersService } from '../../modules/users/services/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google-auth') {
  constructor(
    googleConfigService: GoogleConfigService,
    private readonly _usersService: UsersService,
  ) {
    super({
      callbackURL: googleConfigService.googleCallbackUrl,
      clientID: googleConfigService.googleClientId,
      clientSecret: googleConfigService.googleClientSecret,
      scope: ['email', 'profile'],
    });
  }

  public async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value;
      const avatar = profile.photos?.[0]?.value;

      const user: UsersEntity = await this._usersService.findOrCreateSsoUser({
        avatar,
        email,
        googleId: profile.id,
        isEmailVerified: !!email,
        name: profile.displayName,
        provider: 'google',
        providerId: profile.id,
      });

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
