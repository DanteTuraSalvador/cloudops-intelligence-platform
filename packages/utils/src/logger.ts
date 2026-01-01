import winston from 'winston';

export interface LogContext {
  requestId?: string;
  accountId?: string;
  service?: string;
  [key: string]: unknown;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

export function createLogger(service: string, context?: LogContext) {
  const isProduction = process.env.NODE_ENV === 'production';

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    defaultMeta: {
      service,
      ...context,
    },
    format: logFormat,
    transports: [
      new winston.transports.Console({
        format: isProduction ? logFormat : consoleFormat,
      }),
    ],
  });
}

// Default logger for quick usage
export const logger = createLogger('cloudops');

// Lambda-specific logger that includes request context
export function createLambdaLogger(
  service: string,
  event?: { requestContext?: { requestId?: string } }
) {
  return createLogger(service, {
    requestId: event?.requestContext?.requestId,
  });
}
