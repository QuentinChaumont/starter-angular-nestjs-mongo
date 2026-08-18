import { HttpStatus } from '@nestjs/common';
import { ApplicationError } from './application-error';
import { ConflictError } from './conflict.error';
import { ForbiddenError } from './forbidden.error';
import { NotFoundError } from './not-found.error';
import { UnauthorizedError } from './unauthorized.error';
import { ValidationError } from './validation.error';

describe('specialized application errors', () => {
  it.each([
    [NotFoundError, HttpStatus.NOT_FOUND],
    [ConflictError, HttpStatus.CONFLICT],
    [ForbiddenError, HttpStatus.FORBIDDEN],
    [UnauthorizedError, HttpStatus.UNAUTHORIZED],
    [ValidationError, HttpStatus.BAD_REQUEST],
  ])('%p carries the fixed status code %i', (ErrorClass, expectedStatus) => {
    const error = new ErrorClass('SOME_CODE', 'Some message', {
      field: 'value',
    });

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.statusCode).toBe(expectedStatus);
    expect(error.code).toBe('SOME_CODE');
    expect(error.message).toBe('Some message');
    expect(error.details).toEqual({ field: 'value' });
  });

  it('sets the error name to the concrete class name', () => {
    const error = new NotFoundError('USER_NOT_FOUND', 'User not found');
    expect(error.name).toBe('NotFoundError');
  });
});
