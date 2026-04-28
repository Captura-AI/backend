// NestJS Libraries
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

// RxJS
import { Observable } from 'rxjs';
import { RequestContextService } from '../request-context/request-context.service';

type HttpRequest = {
  correlationId?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  requestId?: string;
  user?: IRequestUser;
};

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(private readonly _requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    this._requestContextService.setUser(request.user);

    return next.handle();
  }
}
