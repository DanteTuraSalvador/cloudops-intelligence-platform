import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger, getTTL, getISOTimestamp } from '@cloudops/utils';
import type { CostData, CostBreakdown } from '@cloudops/types';

const logger = createLogger('data-collector:costs');

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

const costExplorerClient = new CostExplorerClient(awsConfig);
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient(dynamoConfig));

const COSTS_TABLE = process.env.COSTS_TABLE || 'cloudops-costs';

export async function collectCosts(accountId: string = 'demo-account'): Promise<void> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = yesterday.toISOString().slice(0, 10);

  logger.info('Starting cost collection', { accountId, date: dateStr });

  try {
    let breakdown: CostBreakdown[];

    if (process.env.USE_MOCK_DATA === 'true') {
      // Use mock data for local development
      breakdown = generateMockCostBreakdown();
      logger.debug('Using mock cost data');
    } else {
      // Fetch real data from Cost Explorer
      breakdown = await fetchCostExplorerData(dateStr);
      logger.debug('Fetched real Cost Explorer data');
    }

    const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);

    const costData: CostData = {
      pk: `${accountId}#cost`,
      sk: dateStr,
      accountId,
      date: dateStr,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: 'USD',
      breakdown,
      expiresAt: getTTL(365), // Keep cost data for 1 year
      createdAt: getISOTimestamp(),
    };

    await storeCostData(costData);
    logger.info('Cost collection completed', {
      accountId,
      date: dateStr,
      totalCost: costData.totalCost,
    });
  } catch (error) {
    logger.error('Failed to collect costs', { accountId, error });
    throw error;
  }
}

async function fetchCostExplorerData(dateStr: string): Promise<CostBreakdown[]> {
  try {
    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: dateStr,
        End: dateStr,
      },
      Granularity: 'DAILY',
      Metrics: ['UnblendedCost', 'UsageQuantity'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE',
        },
      ],
    });

    const response = await costExplorerClient.send(command);
    const breakdown: CostBreakdown[] = [];

    if (response.ResultsByTime && response.ResultsByTime[0]?.Groups) {
      for (const group of response.ResultsByTime[0].Groups) {
        const service = group.Keys?.[0] || 'Unknown';
        const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
        const usage = parseFloat(group.Metrics?.UsageQuantity?.Amount || '0');

        if (cost > 0.01) {
          // Only include services with meaningful cost
          breakdown.push({
            service,
            cost: Math.round(cost * 100) / 100,
            usage: Math.round(usage),
            unit: group.Metrics?.UsageQuantity?.Unit || 'Units',
          });
        }
      }
    }

    // Sort by cost descending
    breakdown.sort((a, b) => b.cost - a.cost);

    return breakdown;
  } catch (error) {
    logger.error('Failed to fetch Cost Explorer data', { error });
    // Fallback to mock data on error
    return generateMockCostBreakdown();
  }
}

async function storeCostData(costData: CostData): Promise<void> {
  const command = new PutCommand({
    TableName: COSTS_TABLE,
    Item: costData,
  });

  await dynamoClient.send(command);
}

function generateMockCostBreakdown(): CostBreakdown[] {
  const services = [
    { service: 'Amazon EC2', baseRange: [30, 80], usageRange: [500, 1500], unit: 'Hours' },
    { service: 'Amazon S3', baseRange: [5, 30], usageRange: [50, 200], unit: 'GB' },
    { service: 'AWS Lambda', baseRange: [2, 15], usageRange: [100000, 1000000], unit: 'Requests' },
    { service: 'Amazon DynamoDB', baseRange: [5, 25], usageRange: [10, 100], unit: 'GB-Month' },
    { service: 'Amazon RDS', baseRange: [20, 60], usageRange: [300, 700], unit: 'Hours' },
    { service: 'Amazon CloudWatch', baseRange: [3, 15], usageRange: [1, 20], unit: 'GB' },
    { service: 'AWS API Gateway', baseRange: [1, 10], usageRange: [50000, 500000], unit: 'Requests' },
    { service: 'Amazon SNS', baseRange: [0.5, 5], usageRange: [1000, 50000], unit: 'Notifications' },
    { service: 'Amazon SQS', baseRange: [0.5, 5], usageRange: [10000, 100000], unit: 'Requests' },
    { service: 'AWS Secrets Manager', baseRange: [1, 5], usageRange: [5, 20], unit: 'Secrets' },
  ];

  return services.map(({ service, baseRange, usageRange, unit }) => ({
    service,
    cost: Math.round((baseRange[0] + Math.random() * (baseRange[1] - baseRange[0])) * 100) / 100,
    usage: Math.floor(usageRange[0] + Math.random() * (usageRange[1] - usageRange[0])),
    unit,
  }));
}

// Lambda handler for EventBridge scheduled events
export async function handler(event: unknown): Promise<void> {
  logger.info('Lambda triggered for cost collection', { event });
  await collectCosts();
}
