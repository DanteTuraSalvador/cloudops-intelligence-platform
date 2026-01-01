// Logger
export { createLogger, createLambdaLogger, logger, type LogContext } from './logger.js';

// Errors
export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  AWSError,
  handleError,
  isAppError,
} from './errors.js';

// Validators
export {
  z,
  dateStringSchema,
  accountIdSchema,
  awsAccountIdSchema,
  paginationSchema,
  metricTypeSchema,
  metricQuerySchema,
  metricSchema,
  costQuerySchema,
  alertSeveritySchema,
  alertTypeSchema,
  alertRuleSchema,
  validateOrThrow,
  validateSafe,
} from './validators.js';

// Utility functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / oldValue) * 100;
}

// TTL helper for DynamoDB (90 days from now)
export function getTTL(daysFromNow: number = 90): number {
  return Math.floor(Date.now() / 1000) + daysFromNow * 24 * 60 * 60;
}

// ISO timestamp helper
export function getISOTimestamp(): string {
  return new Date().toISOString();
}
