export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, true, { resource, id });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, true, { retryAfter });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`Service '${service}' is currently unavailable`, 'SERVICE_UNAVAILABLE', 503, true, {
      service,
    });
  }
}

export class AWSError extends AppError {
  constructor(service: string, operation: string, originalError: Error) {
    super(
      `AWS ${service} ${operation} failed: ${originalError.message}`,
      'AWS_ERROR',
      500,
      true,
      {
        service,
        operation,
        originalMessage: originalError.message,
      }
    );
  }
}

// Error handler for Lambda functions
export function handleError(error: unknown): {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
} {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      }),
      headers,
    };
  }

  // Unknown error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return {
    statusCode: 500,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    }),
    headers,
  };
}

// Type guard for AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
