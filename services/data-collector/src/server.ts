import express, { Request, Response, Express } from 'express';
import { createLogger } from '@cloudops/utils';
import { collectMetrics } from './handlers/collect-metrics.js';
import { collectCosts } from './handlers/collect-costs.js';

const logger = createLogger('data-collector');

const app: Express = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'data-collector',
    timestamp: new Date().toISOString(),
  });
});

// Manual trigger endpoints (for testing)
app.post('/collect/metrics', async (_req: Request, res: Response) => {
  try {
    logger.info('Manually triggering metrics collection');
    await collectMetrics();
    res.json({ success: true, message: 'Metrics collection triggered' });
  } catch (error) {
    logger.error('Metrics collection failed', { error });
    res.status(500).json({ success: false, message: 'Collection failed' });
  }
});

app.post('/collect/costs', async (_req: Request, res: Response) => {
  try {
    logger.info('Manually triggering cost collection');
    await collectCosts();
    res.json({ success: true, message: 'Cost collection triggered' });
  } catch (error) {
    logger.error('Cost collection failed', { error });
    res.status(500).json({ success: false, message: 'Collection failed' });
  }
});

app.listen(PORT, () => {
  logger.info(`Data Collector running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
  });
});

export { app };
