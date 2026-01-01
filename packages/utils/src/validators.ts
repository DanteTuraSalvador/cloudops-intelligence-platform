import { z } from 'zod';

// ============================================================================
// Common Validators
// ============================================================================

export const dateStringSchema = z.string().datetime({ message: 'Invalid ISO 8601 date string' });

export const accountIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9-_]+$/, 'Account ID must be alphanumeric with dashes and underscores');

export const awsAccountIdSchema = z
  .string()
  .length(12)
  .regex(/^\d{12}$/, 'AWS Account ID must be exactly 12 digits');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================================================
// Metric Validators
// ============================================================================

export const metricTypeSchema = z.enum([
  'CPUUtilization',
  'MemoryUtilization',
  'NetworkIn',
  'NetworkOut',
  'DiskReadOps',
  'DiskWriteOps',
  'DatabaseConnections',
  'LambdaInvocations',
  'LambdaDuration',
  'LambdaErrors',
]);

export const metricQuerySchema = z.object({
  accountId: accountIdSchema,
  metricType: metricTypeSchema.optional(),
  startTime: dateStringSchema,
  endTime: dateStringSchema,
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

export const metricSchema = z.object({
  accountId: accountIdSchema,
  metricType: metricTypeSchema,
  value: z.number(),
  unit: z.enum([
    'Percent',
    'Bytes',
    'Count',
    'Milliseconds',
    'Seconds',
    'BytesPerSecond',
  ]),
  dimensions: z.record(z.string()).optional(),
  tags: z.record(z.string()).optional(),
});

// ============================================================================
// Cost Validators
// ============================================================================

export const costQuerySchema = z.object({
  accountId: accountIdSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

// ============================================================================
// Alert Validators
// ============================================================================

export const alertSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);

export const alertTypeSchema = z.enum(['anomaly', 'budget', 'threshold', 'recommendation']);

export const alertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  type: alertTypeSchema,
  condition: z.object({
    metricType: metricTypeSchema.optional(),
    operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
    threshold: z.number(),
    duration: z.number().int().positive().optional(),
  }),
  actions: z.array(
    z.object({
      type: z.enum(['email', 'sns', 'webhook']),
      target: z.string().min(1),
    })
  ),
  enabled: z.boolean().default(true),
});

// ============================================================================
// Utility Functions
// ============================================================================

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }
  return result.data;
}

export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors };
}

// Re-export zod for convenience
export { z };
