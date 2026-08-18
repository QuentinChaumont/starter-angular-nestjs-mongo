import type { ValidationError as ClassValidatorError } from 'class-validator';
import { formatValidationErrors } from './format-validation-errors';

function buildError(
  property: string,
  constraints: Record<string, string>,
  children: ClassValidatorError[] = [],
): ClassValidatorError {
  return { property, constraints, children } as ClassValidatorError;
}

describe('formatValidationErrors', () => {
  it('flattens a single top-level error', () => {
    const errors = [
      buildError('email', { isEmail: 'email must be an email' }),
    ];

    expect(formatValidationErrors(errors)).toEqual([
      { field: 'email', errors: ['email must be an email'] },
    ]);
  });

  it('collects multiple constraints for the same field', () => {
    const errors = [
      buildError('password', {
        minLength: 'password must be at least 8 characters',
        matches: 'password must contain a number',
      }),
    ];

    expect(formatValidationErrors(errors)).toEqual([
      {
        field: 'password',
        errors: [
          'password must be at least 8 characters',
          'password must contain a number',
        ],
      },
    ]);
  });

  it('flattens nested children with a dotted field path', () => {
    const errors = [
      buildError('address', {}, [
        buildError('city', { isNotEmpty: 'city should not be empty' }),
      ]),
    ];

    expect(formatValidationErrors(errors)).toEqual([
      { field: 'address.city', errors: ['city should not be empty'] },
    ]);
  });

  it('returns an empty array when there are no errors', () => {
    expect(formatValidationErrors([])).toEqual([]);
  });
});
