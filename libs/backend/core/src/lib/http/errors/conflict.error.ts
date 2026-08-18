import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from './application-error';

export class ConflictError extends ApplicationError {
  constructor(code: string, message: string, details?: unknown) {
    super({ code, message, statusCode: HttpStatus.CONFLICT, details });
  }
}
