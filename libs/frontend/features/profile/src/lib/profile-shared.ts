import { HttpErrorResponse } from '@angular/common/http';
import { isApiError } from '@org/shared-contracts';

/** Server-enforced minimum; mirrored here for inline validation. */
export const MIN_PASSWORD_LENGTH = 8;

/** Pull a human message out of an HTTP error, falling back to `fallback`. */
export function apiMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : null;
  return isApiError(body) ? body.message : fallback;
}

/** Form layout shared by every profile section (scoped per component). */
export const PROFILE_FORM_STYLES = `
  form {
    display: flex;
    flex-direction: column;
    gap: var(--app-space-3);
  }
  .profile__row {
    display: flex;
    gap: var(--app-space-2);
  }
  .profile__row mat-form-field {
    flex: 1;
  }
  mat-form-field {
    width: 100%;
  }
  .profile__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--app-space-2);
    margin-block-start: 2px;
  }
  .profile__status-line {
    margin: 0;
  }
  .profile__error {
    color: var(--app-color-error);
    font-size: 0.8125rem;
    margin: 0;
  }
  .profile__hint {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: color-mix(in srgb, var(--app-color-on-surface) 60%, transparent);
    margin: 2px 0 0;
  }
`;

/** The linked-rows list shared by "Connected accounts" and "Devices". */
export const PROFILE_LIST_STYLES = `
  .accounts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .accounts__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--app-space-3);
    padding-block: var(--app-space-3);
    border-block-start: var(--app-border-hairline);
  }
  .accounts__row:first-child {
    border-block-start: none;
    padding-block-start: 0;
  }
  .accounts__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .accounts__name {
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .accounts__sub {
    font: 500 0.6875rem/1.3 var(--app-font-mono);
    letter-spacing: 0.02em;
    color: color-mix(in srgb, var(--app-color-on-surface) 55%, transparent);
    overflow-wrap: anywhere;
  }
`;
