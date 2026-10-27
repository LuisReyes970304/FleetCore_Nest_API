import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';

// Catches every exception thrown anywhere in the request lifecycle (HttpExceptions raised by
// guards/services, plus anything unexpected) and normalizes it to the uniform error envelope so
// no endpoint ever leaks a raw, unformatted 500.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolve(exception);

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): { statusCode: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return { statusCode: exception.getStatus(), message: payload };
      }
      const { message } = payload as { message?: string | string[] };
      return { statusCode: exception.getStatus(), message: message ?? exception.message };
    }

    // A unique-constraint violation that slipped past a service's own pre-check (e.g. a race
    // condition between the check and the insert) is a client-facing conflict, not a 500.
    if (this.isUniqueViolation(exception)) {
      return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists' };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }

  private isUniqueViolation(exception: unknown): boolean {
    const err = exception as { code?: string; driverError?: { code?: string } };
    return err?.code === POSTGRES_UNIQUE_VIOLATION || err?.driverError?.code === POSTGRES_UNIQUE_VIOLATION;
  }
}
