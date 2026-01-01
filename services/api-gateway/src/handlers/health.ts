import { Router, Request, Response } from 'express';
import type { HealthCheckResponse } from '@cloudops/types';

export const healthRouter: Router = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: 'healthy',
    version: process.env.VERSION || '0.1.0',
    timestamp: new Date().toISOString(),
    services: [
      { name: 'api-gateway', status: 'up' },
    ],
  };

  res.json(response);
});

// Readiness probe for Kubernetes
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  // TODO: Check database connectivity
  res.json({ ready: true });
});

// Liveness probe for Kubernetes
healthRouter.get('/live', async (_req: Request, res: Response) => {
  res.json({ alive: true });
});
