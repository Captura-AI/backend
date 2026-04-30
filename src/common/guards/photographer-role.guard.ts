// Enums
import { UserRoleEnum } from '../../modules/users/enums/user-role.enum';

// NestJS Libraries
import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// RxJS
import type { Observable } from 'rxjs';

@Injectable()
export class PhotographerRoleGuard extends AuthGuard('jwt') {
  private readonly _logger = new Logger(PhotographerRoleGuard.name);

  public canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  public handleRequest<TUser = IRequestUser>(err: unknown, user: TUser, info: string): TUser {
    if (err ?? !user) {
      this._logger.warn(`[WARN] PhotographerRoleGuard: ${info}`);
      throw (err instanceof Error ? err : null) ?? new UnauthorizedException();
    }

    const requestUser = user as unknown as IRequestUser;

    if (requestUser.role !== UserRoleEnum.PHOTOGRAPHER) {
      throw new ForbiddenException('Access restricted to photographers only.');
    }

    return user;
  }
}
