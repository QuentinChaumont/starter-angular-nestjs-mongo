import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from './application-error';

export class ValidationError extends ApplicationError {
  constructor(code: string, message: string, details?: unknown) {
    super({ code, message, statusCode: HttpStatus.BAD_REQUEST, details });
  }
}
