import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger, getTTL, getISOTimestamp } from '@cloudops/utils';
import type { Metric, MetricType, MetricUnit } from '@cloudops/types';

const logger = createLogger('data-collector:metrics');

// Configure clients for local development
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ENDPOINT && {
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
};

const dynamoConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  }),
};

const cloudwatchClient = new CloudWatchClient(awsConfig);
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient(dynamoConfig));

const METRICS_TABLE = process.env.METRICS_TABLE || 'cloudops-metrics';

interface MetricDefinition {
  namespace: string;
  metricName: string;
  metricType: MetricType;
  unit: MetricUnit;
}

const METRICS_TO_COLLECT: MetricDefinition[] = [
  { namespace: 'AWS/EC2', metricName: 'CPUUtilization', metricType: 'CPUUtilization', unit: 'Percent' },
  { namespace: 'AWS/EC2', metricName: 'NetworkIn', metricType: 'NetworkIn', unit: 'Bytes' },
  { namespace: 'AWS/EC2', metricName: 'NetworkOut', metricType: 'NetworkOut', unit: 'Bytes' },
  { namespace: 'AWS/EC2', metricName: 'DiskReadOps', metricType: 'DiskReadOps', unit: 'Count' },
  { namespace: 'AWS/EC2', metricName: 'DiskWriteOps', metricType: 'DiskWriteOps', unit: 'Count' },
  { namespace: 'AWS/Lambda', metricName: 'Invocations', metricType: 'LambdaInvocations', unit: 'Count' },
  { namespace: 'AWS/Lambda', metricName: 'Duration', metricType: 'LambdaDuration', unit: 'Milliseconds' },
  { namespace: 'AWS/Lambda', metricName: 'Errors', metricType: 'LambdaErrors', unit: 'Count' },
];

export async function collectMetrics(accountId: string = 'demo-account'): Promise<void> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

  logger.info('Starting metrics collection', {
    accountId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });

  for (const metricDef of METRICS_TO_COLLECT) {
    try {
      let metricValue: number;

      if (process.env.USE_MOCK_DATA === 'true') {
        // Use mock data for local development
        metricValue = generateMockMetricValue(metricDef.metricType);
        logger.debug('Using mock data', { metricType: metricDef.metricType });
      } else {
        // Fetch real data from CloudWatch
        metricValue = await fetchCloudWatchMetric(metricDef, startTime, endTime);
        logger.debug('Fetched real CloudWatch data', { metricType: metricDef.metricType });
      }

      const metric: Metric = {
        pk: `${accountId}#${metricDef.metricType}`,
        sk: endTime.toISOString(),
        accountId,
        metricType: metricDef.metricType,
        value: metricValue,
        unit: metricDef.unit,
        dimensions: {
          namespace: metricDef.namespace,
        },
        expiresAt: getTTL(90),
        createdAt: getISOTimestamp(),
      };

      await storeMetric(metric);
      logger.debug('Stored metric', { metricType: metricDef.metricType, value: metricValue });
    } catch (error) {
      logger.error('Failed to collect metric', {
        metricType: metricDef.metricType,
        error,
      });
    }
  }

  logger.info('Metrics collection completed', { accountId });
}

async function fetchCloudWatchMetric(
  metricDef: MetricDefinition,
  startTime: Date,
  endTime: Date
): Promise<number> {
  try {
    const command = new GetMetricDataCommand({
      MetricDataQueries: [
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: metricDef.namespace,
              MetricName: metricDef.metricName,
            },
            Period: 300, // 5 minutes
            Stat: 'Average',
          },
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
    });

    const response = await cloudwatchClient.send(command);

    if (response.MetricDataResults && response.MetricDataResults[0]?.Values?.length) {
      const values = response.MetricDataResults[0].Values;
      // Return the most recent value
      return values[values.length - 1] || 0;
    }

    // If no data available, return 0
    logger.warn('No CloudWatch data available for metric', {
      namespace: metricDef.namespace,
      metricName: metricDef.metricName,
    });
    return 0;
  } catch (error) {
    logger.error('Failed to fetch CloudWatch metric', {
      namespace: metricDef.namespace,
      metricName: metricDef.metricName,
      error,
    });
    // Fallback to mock data on error
    return generateMockMetricValue(metricDef.metricType);
  }
}

async function storeMetric(metric: Metric): Promise<void> {
  const command = new PutCommand({
    TableName: METRICS_TABLE,
    Item: metric,
  });

  await dynamoClient.send(command);
}

function generateMockMetricValue(metricType: MetricType): number {
  const mockValues: Record<MetricType, () => number> = {
    CPUUtilization: () => 20 + Math.random() * 60, // 20-80%
    MemoryUtilization: () => 40 + Math.random() * 40, // 40-80%
    NetworkIn: () => Math.floor(1000000 + Math.random() * 5000000), // 1-6 MB
    NetworkOut: () => Math.floor(500000 + Math.random() * 2500000), // 0.5-3 MB
    DiskReadOps: () => Math.floor(100 + Math.random() * 400), // 100-500 ops
    DiskWriteOps: () => Math.floor(50 + Math.random() * 200), // 50-250 ops
    DatabaseConnections: () => Math.floor(10 + Math.random() * 50), // 10-60 connections
    LambdaInvocations: () => Math.floor(1000 + Math.random() * 9000), // 1000-10000 invocations
    LambdaDuration: () => 50 + Math.random() * 450, // 50-500ms
    LambdaErrors: () => Math.floor(Math.random() * 10), // 0-10 errors
  };

  return mockValues[metricType]();
}

// Lambda handler for EventBridge scheduled events
export async function handler(event: unknown): Promise<void> {
  logger.info('Lambda triggered', { event });
  await collectMetrics();
}
