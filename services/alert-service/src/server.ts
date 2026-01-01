import express, { Request, Response, Express } from 'express';
import { createLogger } from '@cloudops/utils';
import { sendAlert, getAlerts, SendAlertInput } from './handlers/send-alert.js';

const logger = createLogger('alert-service');

const app: Express = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'alert-service',
    timestamp: new Date().toISOString(),
  });
});

// Get alerts for an account
app.get('/alerts/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const limit = Number(req.query.limit) || 50;

    logger.info('Fetching alerts', { accountId, limit });
    const alerts = await getAlerts(accountId, limit);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Failed to fetch alerts', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch alerts' },
    });
  }
});

// Send a new alert
app.post('/alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    const alertInput: SendAlertInput = req.body;

    if (!alertInput.accountId || !alertInput.type || !alertInput.title || !alertInput.message) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      });
      return;
    }

    const alert = await sendAlert(alertInput);

    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('Failed to send alert', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send alert' },
    });
  }
});

// Acknowledge an alert
app.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { accountId } = req.body;

    logger.info('Acknowledging alert', { alertId, accountId });

    res.json({
      success: true,
      message: 'Alert acknowledged',
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to acknowledge alert' },
    });
  }
});

app.listen(PORT, () => {
  logger.info(`Alert Service running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
  });
});

export { app };
