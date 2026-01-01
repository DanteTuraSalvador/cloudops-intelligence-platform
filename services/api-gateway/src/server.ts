import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import serverless from 'serverless-http';
import { createLogger } from '@cloudops/utils';
import { healthRouter } from './handlers/health.js';
import { metricsRouter } from './handlers/metrics.js';
import { costsRouter } from './handlers/costs.js';
import { insightsRouter } from './handlers/insights.js';

const logger = createLogger('api-gateway');

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/metrics', metricsRouter);
app.use('/api/v1/costs', costsRouter);
app.use('/api/v1/insights', insightsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// Lambda handler for AWS deployment
export const handler = serverless(app);

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`, {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
    });
  });
}

export { app };
