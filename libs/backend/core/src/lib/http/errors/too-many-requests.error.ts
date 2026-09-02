import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from './application-error';

export class TooManyRequestsError extends ApplicationError {
  constructor(code: string, message: string, details?: unknown) {
    super({
      code,
      message,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      details,
    });
  }
}
