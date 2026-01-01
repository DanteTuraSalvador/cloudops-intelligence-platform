import { Router, Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger, validateOrThrow, costQuerySchema } from '@cloudops/utils';
import type { ApiResponse, CostData, CostQuery, CostForecast } from '@cloudops/types';

const logger = createLogger('api-gateway:costs');

const dynamoConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
};

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient(dynamoConfig));
const COSTS_TABLE = process.env.COSTS_TABLE || 'cloudops-costs';

export const costsRouter: Router = Router();

// GET /api/v1/costs - Get cost data for an account
costsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const query = validateOrThrow<CostQuery>(costQuerySchema, {
      accountId: req.query.accountId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    logger.info('Fetching cost data', { query });

    const pk = `${query.accountId}#cost`;
    const command = new QueryCommand({
      TableName: COSTS_TABLE,
      KeyConditionExpression: 'pk = :pk AND sk BETWEEN :startDate AND :endDate',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':startDate': query.startDate,
        ':endDate': query.endDate,
      },
      ScanIndexForward: false, // Most recent first
    });

    const result = await dynamoClient.send(command);
    const costs = (result.Items || []) as CostData[];

    const response: ApiResponse<CostData[]> = {
      success: true,
      data: costs,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      } as any,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching cost data', { error });
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Invalid request',
      },
    });
  }
});

// GET /api/v1/costs/summary - Get cost summary
costsRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const { accountId, period } = req.query;

    logger.info('Fetching cost summary', { accountId, period });

    const summary = {
      accountId,
      period: period || 'monthly',
      totalCost: 1250.00,
      previousPeriodCost: 1100.00,
      percentageChange: 13.6,
      topServices: [
        { service: 'EC2', cost: 500.00, percentage: 40 },
        { service: 'RDS', cost: 300.00, percentage: 24 },
        { service: 'S3', cost: 200.00, percentage: 16 },
      ],
      currency: 'USD',
    };

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching cost summary', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cost summary',
      },
    });
  }
});

// GET /api/v1/costs/forecast - Get cost forecast
costsRouter.get('/forecast', async (req: Request, res: Response) => {
  try {
    const { accountId, months } = req.query;

    logger.info('Generating cost forecast', { accountId, months });

    // TODO: Call .NET cost-analyzer service for forecasting
    const forecasts: CostForecast[] = [];
    const numMonths = Number(months) || 3;
    const baseDate = new Date();

    for (let i = 1; i <= numMonths; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      forecasts.push({
        accountId: String(accountId),
        forecastDate: forecastDate.toISOString().slice(0, 10),
        predictedCost: 1300 + (Math.random() * 200 - 100), // Mock forecast
        confidenceLevel: 0.85,
        generatedAt: new Date().toISOString(),
      });
    }

    const response: ApiResponse<CostForecast[]> = {
      success: true,
      data: forecasts,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error generating forecast', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate cost forecast',
      },
    });
  }
});
