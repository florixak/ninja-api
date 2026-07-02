import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: T) => {
        if (data === undefined) {
          return data;
        }

        if (this.isApiSuccessResponse(data)) {
          return data;
        }

        return { data, meta: {} } satisfies ApiSuccessResponse<T>;
      }),
    );
  }

  private isApiSuccessResponse(
    value: unknown,
  ): value is ApiSuccessResponse<unknown> {
    return (
      value !== null &&
      typeof value === 'object' &&
      'data' in value &&
      'meta' in value
    );
  }
}
