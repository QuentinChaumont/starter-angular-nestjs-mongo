import type { ValidationError as ClassValidatorError } from 'class-validator';
import { ValidationError } from '../errors/validation.error';
import { createValidationPipe } from './create-validation-pipe';

describe('createValidationPipe', () => {
  it('enables whitelist, forbidNonWhitelisted and transform', () => {
    const pipe = createValidationPipe();

    expect(pipe['validatorOptions']).toMatchObject({
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(pipe['isTransformEnabled']).toBe(true);
  });

  it('converts class-validator errors into a ValidationError', () => {
    const pipe = createValidationPipe();
    const exceptionFactory = pipe['exceptionFactory'];

    const errors = [
      {
        property: 'email',
        constraints: { isEmail: 'email must be an email' },
        children: [],
      },
    ] as ClassValidatorError[];

    const exception = exceptionFactory(errors);

    expect(exception).toBeInstanceOf(ValidationError);
    expect(exception.code).toBe('VALIDATION_ERROR');
    expect(exception.statusCode).toBe(400);
    expect(exception.details).toEqual([
      { field: 'email', errors: ['email must be an email'] },
    ]);
  });
});
