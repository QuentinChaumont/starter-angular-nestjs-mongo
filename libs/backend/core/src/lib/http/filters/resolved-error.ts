export interface ResolvedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
