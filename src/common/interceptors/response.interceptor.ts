import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';

export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
}

// Wraps every successful response in the uniform { success, statusCode, data, timestamp }
// envelope required across the API. statusCode is read off the real Response object so it
// reflects whatever the controller/decorator actually set (200 vs 201, etc.).
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode: response.statusCode,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
