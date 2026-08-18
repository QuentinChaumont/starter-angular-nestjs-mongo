import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from '../errors/validation.error';
import { formatValidationErrors } from './format-validation-errors';

/**
 * Global input validation for the API: unknown properties are rejected,
 * payloads are transformed to their DTO types, and class-validator's error
 * tree is converted into our own ValidationError so the response matches
 * the uniform error format from GlobalExceptionFilter.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new ValidationError(
        'VALIDATION_ERROR',
        'Validation failed',
        formatValidationErrors(errors),
      ),
  });
}
