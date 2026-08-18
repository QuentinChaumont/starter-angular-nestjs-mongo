import type { ValidationError as ClassValidatorError } from 'class-validator';

export interface FieldValidationError {
  field: string;
  errors: string[];
}

function fieldPath(prefix: string, property: string): string {
  return prefix ? `${prefix}.${property}` : property;
}

/**
 * Flattens class-validator's (potentially nested, via `children`) error
 * tree into a simple per-field list, safe to surface in an API response.
 */
export function formatValidationErrors(
  errors: ClassValidatorError[],
  prefix = '',
): FieldValidationError[] {
  return errors.flatMap((error) => {
    const field = fieldPath(prefix, error.property);
    const ownErrors = Object.values(error.constraints ?? {});
    const childErrors = error.children?.length
      ? formatValidationErrors(error.children, field)
      : [];

    return ownErrors.length > 0
      ? [{ field, errors: ownErrors }, ...childErrors]
      : childErrors;
  });
}
