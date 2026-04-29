// Decorators
import { ApiBaseResponse } from '../../../common/decorators/api-base-response.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// Entities
import { UsersEntity } from '../entities/users.entity';

// Guards
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';

// NestJS Libraries
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, UseGuards } from '@nestjs/common';

// Services
import { UsersService } from '../services/users.service';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly _usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile including photographer profile if applicable',
  })
  @ApiBaseResponse(UsersEntity)
  public async getMe(@CurrentUser() user: IRequestUser) {
    const result = await this._usersService.getMe(user.id);

    return {
      message: 'Profile retrieved successfully',
      result,
    };
  }
}
