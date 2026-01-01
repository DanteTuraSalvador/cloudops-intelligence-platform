import { Router, Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger, validateOrThrow, metricQuerySchema } from '@cloudops/utils';
import type { ApiResponse, Metric, MetricQuery } from '@cloudops/types';

const logger = createLogger('api-gateway:metrics');

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
const METRICS_TABLE = process.env.METRICS_TABLE || 'cloudops-metrics';

export const metricsRouter: Router = Router();

// GET /api/v1/metrics - Get metrics for an account
metricsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const query = validateOrThrow<MetricQuery>(metricQuerySchema, {
      accountId: req.query.accountId,
      metricType: req.query.metricType,
      startTime: req.query.startTime,
      endTime: req.query.endTime,
      limit: req.query.limit,
    });

    logger.info('Fetching metrics', { query });

    const pk = `${query.accountId}#${query.metricType}`;
    const command = new QueryCommand({
      TableName: METRICS_TABLE,
      KeyConditionExpression: 'pk = :pk AND sk BETWEEN :startTime AND :endTime',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':startTime': query.startTime,
        ':endTime': query.endTime,
      },
      Limit: query.limit || 100,
      ScanIndexForward: false, // Most recent first
    });

    const result = await dynamoClient.send(command);
    const metrics = (result.Items || []) as Metric[];

    const response: ApiResponse<Metric[]> = {
      success: true,
      data: metrics,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      } as any,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching metrics', { error });
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Invalid request',
      },
    });
  }
});

// GET /api/v1/metrics/:metricType - Get specific metric type
metricsRouter.get('/:metricType', async (req: Request, res: Response) => {
  try {
    const { metricType } = req.params;
    const { accountId } = req.query;

    logger.info('Fetching specific metric type', { metricType, accountId });

    // TODO: Implement DynamoDB query by metric type
    const response: ApiResponse<Metric[]> = {
      success: true,
      data: [],
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching metric type', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch metrics',
      },
    });
  }
});

// POST /api/v1/metrics - Store a new metric (internal use)
metricsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const metric = req.body;
    logger.info('Storing metric', { metric });

    // TODO: Implement DynamoDB put
    const response: ApiResponse<Metric> = {
      success: true,
      data: metric,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error storing metric', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to store metric',
      },
    });
  }
});
