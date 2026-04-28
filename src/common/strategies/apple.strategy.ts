// Entities
import type { UsersEntity } from '../../modules/users/entities/users.entity';

// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import type { Profile, VerifyCallback } from 'passport-apple';
import { Strategy } from 'passport-apple';

// Services
import { AppleConfigService } from '../../configurations/apple/apple-configuration.service';
import { UsersService } from '../../modules/users/services/users.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple-auth') {
  constructor(
    appleConfigService: AppleConfigService,
    private readonly _usersService: UsersService,
  ) {
    super({
      callbackURL: appleConfigService.appleCallbackUrl,
      clientID: appleConfigService.appleClientId,
      keyID: appleConfigService.appleKeyId,
      privateKeyString: appleConfigService.applePrivateKey,
      scope: ['email', 'name'],
      teamID: appleConfigService.appleTeamId,
    });
  }

  public async validate(
    _accessToken: string,
    _refreshToken: string,
    _idToken: object,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const email = profile.email;
      const firstName = profile.name?.firstName;
      const lastName = profile.name?.lastName;
      const name =
        firstName || lastName ? [firstName, lastName].filter(Boolean).join(' ') : undefined;

      const user: UsersEntity = await this._usersService.findOrCreateSsoUser({
        appleId: profile.id,
        email,
        isEmailVerified: !!email,
        name,
        provider: 'apple',
        providerId: profile.id,
      });

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
