export interface ApplicationErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export class ApplicationError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(options: ApplicationErrorOptions) {
    super(options.message);
    this.name = new.target.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}
