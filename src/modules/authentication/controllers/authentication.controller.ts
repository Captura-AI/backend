// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';

// DTOs
import { LoginUsernameDto, LoginWithAccessToken } from '../dtos/login.dto';
import { MagicLinkInitDto } from '../dtos/magic-link-init.dto';
import { MagicLinkVerifyDto } from '../dtos/magic-link-verify.dto';
import { PhoneInitDto } from '../dtos/phone-init.dto';
import { PhoneVerifyDto } from '../dtos/phone-verify.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { UsersEntity } from '../../users/entities/users.entity';

// Guards
import { AuthenticationAppleGuard } from '../../../common/guards/authentication-apple.guard';
import { AuthenticationGoogleGuard } from '../../../common/guards/authentication-google.guard';
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { AuthenticationLocalGuard } from '../../../common/guards/authentication-local.guard';

// NestJS Libraries
import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

// Services
import { AppleConfigService } from '../../../configurations/apple/apple-configuration.service';
import { AuthenticationService } from '../services/authentication.service';
import { GoogleConfigService } from '../../../configurations/google/google-configuration.service';
import { UsersService } from '../../users/services/users.service';

@Controller('authentication')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(
    private readonly _authenticationService: AuthenticationService,
    private readonly _appleConfigService: AppleConfigService,
    private readonly _googleConfigService: GoogleConfigService,
    private readonly _usersService: UsersService,
  ) {}

  // ─── Username / Password ───────────────────────────────────────────────────

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiBaseResponse(LoginWithAccessToken)
  @UseGuards(AuthenticationLocalGuard)
  public async login(@Body() _body: LoginUsernameDto, @Req() req: ICustomRequestHeaders) {
    const result = await this._authenticationService.login(req.user);

    return {
      message: 'User logged in successfully',
      result,
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register with email and password' })
  @ApiBaseResponse(UsersEntity)
  public async create(@Body() requestBody: RegisterEmailDto) {
    const result = await this._authenticationService.register(requestBody);

    return {
      message: 'User registered successfully',
      result,
    };
  }

  @Get('oauth/providers')
  @ApiOperation({ summary: 'Get OAuth provider availability' })
  public getOAuthProviders() {
    const googleAvailable = Boolean(
      this._googleConfigService.googleClientId &&
      this._googleConfigService.googleClientSecret &&
      this._googleConfigService.googleCallbackUrl,
    );
    const appleAvailable = Boolean(
      this._appleConfigService.appleClientId &&
      this._appleConfigService.appleTeamId &&
      this._appleConfigService.appleKeyId &&
      this._appleConfigService.applePrivateKey &&
      this._appleConfigService.appleCallbackUrl,
    );

    return {
      message: 'OAuth provider availability retrieved successfully',
      result: {
        apple: {
          available: appleAvailable,
          message: appleAvailable
            ? 'Apple sign in is available.'
            : 'Apple sign in is not configured on this server.',
        },
        google: {
          available: googleAvailable,
          message: googleAvailable
            ? 'Google sign in is available.'
            : 'Google sign in is not configured on this server. Please restart the backend after setting Google OAuth env values.',
        },
      },
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiBaseResponse(UsersEntity)
  public async getProfile(@Req() req: ICustomRequestHeaders) {
    const result = await this._usersService.findOneById(req.user.id);

    return {
      message: 'Authenticated user profile has been retrieved successfully',
      result,
    };
  }

  // ─── Refresh Token ─────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBaseResponse(LoginWithAccessToken)
  public async refresh(@Body() requestBody: RefreshTokenDto) {
    const result = await this._authenticationService.refreshAccessToken(requestBody);

    return {
      message: 'Access token refreshed successfully',
      result,
    };
  }

  // ─── Phone OTP ─────────────────────────────────────────────────────────────

  @Post('phone/init')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP to phone number via WhatsApp/SMS' })
  public async phoneInit(@Body() requestBody: PhoneInitDto) {
    await this._authenticationService.initPhoneAuth(requestBody);

    return {
      message: 'OTP sent successfully. Please check your WhatsApp/SMS.',
      result: null,
    };
  }

  @Post('phone/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify phone OTP and receive tokens' })
  @ApiBaseResponse(LoginWithAccessToken)
  public async phoneVerify(@Body() requestBody: PhoneVerifyDto) {
    const result = await this._authenticationService.verifyPhoneOtp(requestBody);

    return {
      message: 'Phone number verified successfully',
      result,
    };
  }

  // ─── Magic Link ────────────────────────────────────────────────────────────

  @Post('magic-link/init')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send magic link to email address' })
  public async magicLinkInit(@Body() requestBody: MagicLinkInitDto) {
    await this._authenticationService.initMagicLink(requestBody);

    return {
      message: 'Magic link sent. Please check your email.',
      result: null,
    };
  }

  @Get('magic-link/verify')
  @ApiOperation({ summary: 'Verify magic link token and receive tokens' })
  @ApiBaseResponse(LoginWithAccessToken)
  public async magicLinkVerify(@Query() query: MagicLinkVerifyDto) {
    const result = await this._authenticationService.verifyMagicLink(query);

    return {
      message: 'Magic link verified successfully',
      result,
    };
  }

  // ─── Google OAuth2 ─────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthenticationGoogleGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  public googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthenticationGoogleGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback — returns JWT tokens' })
  @ApiBaseResponse(LoginWithAccessToken)
  public async googleCallback(
    @Req() req: ICustomRequestHeaders & { user: UsersEntity },
    @Res() response: Response,
  ) {
    const result = await this._authenticationService.loginWithSso(req.user);
    const redirectUrl = new URL(
      process.env.AUTH_SUCCESS_REDIRECT_URL ?? 'http://localhost:3000/auth/oauth/callback',
    );

    redirectUrl.hash = new URLSearchParams({
      accessToken: result.accessToken,
      provider: 'google',
      refreshToken: result.refreshToken,
    }).toString();

    return response.redirect(redirectUrl.toString());
  }

  // ─── Apple Sign In ─────────────────────────────────────────────────────────

  @Get('apple')
  @UseGuards(AuthenticationAppleGuard)
  @ApiOperation({ summary: 'Initiate Apple Sign In' })
  public appleAuth() {
    // Guard redirects to Apple
  }

  @Post('apple/callback')
  @HttpCode(200)
  @UseGuards(AuthenticationAppleGuard)
  @ApiOperation({ summary: 'Apple Sign In callback — returns JWT tokens' })
  @ApiBaseResponse(LoginWithAccessToken)
  public async appleCallback(@Req() req: ICustomRequestHeaders & { user: UsersEntity }) {
    const result = await this._authenticationService.loginWithSso(req.user);

    return {
      message: 'Apple login successful',
      result,
    };
  }
}
