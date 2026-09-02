import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  trace?: string;
}

const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_DIM = '\x1b[2m';

const LEVEL_COLORS: Record<LogLevel, string> = {
  log: '\x1b[32m', // green
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  debug: '\x1b[35m', // magenta
  verbose: '\x1b[36m', // cyan
  fatal: '\x1b[41m\x1b[37m', // white on red
};

const CONTEXT_COLOR = '\x1b[33m'; // yellow
const REQUEST_ID_COLOR = '\x1b[36m'; // cyan

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor(private readonly requestContext: RequestContextService) {
    super();
  }

  override log(message: string, context?: string): void {
    this.write('log', message, context);
  }

  override debug(message: string, context?: string): void {
    this.write('debug', message, context);
  }

  override warn(message: string, context?: string): void {
    this.write('warn', message, context);
  }

  override verbose(message: string, context?: string): void {
    this.write('verbose', message, context);
  }

  override error(message: string, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  private write(
    level: LogLevel,
    message: string,
    context?: string,
    trace?: string,
  ): void {
    const entry: StructuredLogEntry = {
      level,
      message,
      ...((context ?? this.context)
        ? { context: context ?? this.context }
        : {}),
      ...(this.requestContext.requestId
        ? { requestId: this.requestContext.requestId }
        : {}),
      ...(trace ? { trace } : {}),
    };

    const line = this.usesColor()
      ? this.formatColored(entry)
      : JSON.stringify(entry);
    process.stdout.write(`${line}\n`);
  }

  /**
   * Colored, human-readable output is only worth it for a developer staring
   * at a terminal. CI, production and anything piping logs to a file or an
   * aggregator (which wants plain, parseable JSON) keep the structured
   * format.
   */
  private usesColor(): boolean {
    return (
      process.env['NODE_ENV'] === 'development' && process.stdout.isTTY === true
    );
  }

  private formatColored(entry: StructuredLogEntry): string {
    const color = LEVEL_COLORS[entry.level] ?? '';
    const timestamp = `${ANSI_DIM}${new Date().toISOString()}${ANSI_RESET}`;
    const level = `${color}${ANSI_BOLD}${entry.level.toUpperCase().padEnd(7)}${ANSI_RESET}`;
    const context = entry.context
      ? ` ${CONTEXT_COLOR}[${entry.context}]${ANSI_RESET}`
      : '';
    const requestId = entry.requestId
      ? ` ${REQUEST_ID_COLOR}(${entry.requestId})${ANSI_RESET}`
      : '';
    const message = `${color}${entry.message}${ANSI_RESET}`;
    const trace = entry.trace ? `\n${ANSI_DIM}${entry.trace}${ANSI_RESET}` : '';

    return `${timestamp} ${level}${context}${requestId} ${message}${trace}`;
  }
}
