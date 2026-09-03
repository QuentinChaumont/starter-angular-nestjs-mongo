import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { ApiError } from '@org/shared-contracts';
import type { Response } from 'express';
import { AppConfigService } from '../../config';
import { AppLogger, RequestContextService } from '../../logger';
import { ApplicationError } from '../errors/application-error';
import { ResolvedError } from './resolved-error';

const DEFAULT_ERROR_CODE = 'ERROR';
const UNKNOWN_ERROR_CODE = 'INTERNAL_SERVER_ERROR';
const UNKNOWN_ERROR_MESSAGE = 'Internal server error';

function extractHttpExceptionMessage(
  payload: unknown,
  fallback: string,
): string {
  if (typeof payload === 'string') {
    return payload;
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

function codeFromStatus(status: number): string {
  const entry = (HttpStatus as unknown as Record<number, string>)[status];
  return entry ?? DEFAULT_ERROR_CODE;
}

const DEFAULT_RETRY_AFTER_SECONDS = 60;

/** A positive integer `retryAfterSeconds` on the error's `details`, if any. */
function retryAfterSecondsFrom(details: unknown): number | undefined {
  if (details && typeof details === 'object' && 'retryAfterSeconds' in details) {
    const value = (details as { retryAfterSeconds: unknown }).retryAfterSeconds;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.ceil(value);
    }
  }
  return undefined;
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
    private readonly config: AppConfigService,
  ) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const resolved = this.resolve(exception);

    this.logOriginal(exception, resolved.statusCode);

    const isProduction = this.config.app.environment === 'production';
    const body: ApiError = {
      statusCode: resolved.statusCode,
      code: resolved.code,
      message: resolved.message,
      requestId: this.requestContext.requestId,
    };

    if (!isProduction && resolved.details !== undefined) {
      body.details = resolved.details;
    }

    // A 429 should always tell the client when to come back. `@nestjs/throttler`
    // sets `Retry-After` itself; our own rate limiters carry the hint in
    // `details.retryAfterSeconds`.
    if (
      resolved.statusCode === HttpStatus.TOO_MANY_REQUESTS &&
      response.getHeader('Retry-After') === undefined
    ) {
      const seconds =
        retryAfterSecondsFrom(resolved.details) ?? DEFAULT_RETRY_AFTER_SECONDS;
      response.setHeader('Retry-After', String(seconds));
    }

    response.status(resolved.statusCode).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof ApplicationError) {
      return {
        statusCode: exception.statusCode,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return {
        statusCode,
        code: codeFromStatus(statusCode),
        message: extractHttpExceptionMessage(
          exception.getResponse(),
          exception.message,
        ),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: UNKNOWN_ERROR_CODE,
      message: UNKNOWN_ERROR_MESSAGE,
      details:
        exception instanceof Error
          ? { stack: exception.stack }
          : { value: exception },
    };
  }

  private logOriginal(exception: unknown, statusCode: number): void {
    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, stack);
    } else {
      this.logger.warn(message);
    }
  }
}
