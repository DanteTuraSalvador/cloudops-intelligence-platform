import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger, generateId, getISOTimestamp } from '@cloudops/utils';
import type { Alert, AlertType, AlertSeverity } from '@cloudops/types';

const logger = createLogger('alert-service');

const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ENDPOINT && {
    endpoint: process.env.AWS_ENDPOINT,
  }),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

const snsClient = new SNSClient(awsConfig);
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient(awsConfig));

const ALERTS_TABLE = process.env.ALERTS_TABLE || 'cloudops-alerts';
const ALERTS_TOPIC_ARN = process.env.ALERTS_TOPIC_ARN || 'arn:aws:sns:us-east-1:000000000000:cloudops-alerts';

export interface SendAlertInput {
  accountId: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  metadata?: Record<string, unknown>;
}

export async function sendAlert(input: SendAlertInput): Promise<Alert> {
  const alert: Alert = {
    id: generateId(),
    accountId: input.accountId,
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity,
    status: 'active',
    createdAt: getISOTimestamp(),
    metadata: input.metadata,
  };

  logger.info('Sending alert', { alertId: alert.id, type: alert.type, severity: alert.severity });

  // Store alert in DynamoDB
  await storeAlert(alert);

  // Publish to SNS
  await publishToSNS(alert);

  logger.info('Alert sent successfully', { alertId: alert.id });
  return alert;
}

async function storeAlert(alert: Alert): Promise<void> {
  const command = new PutCommand({
    TableName: ALERTS_TABLE,
    Item: {
      pk: `ACCOUNT#${alert.accountId}`,
      sk: `ALERT#${alert.createdAt}#${alert.id}`,
      ...alert,
    },
  });

  await dynamoClient.send(command);
}

async function publishToSNS(alert: Alert): Promise<void> {
  const message = JSON.stringify({
    alertId: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    accountId: alert.accountId,
    timestamp: alert.createdAt,
  });

  const command = new PublishCommand({
    TopicArn: ALERTS_TOPIC_ARN,
    Message: message,
    Subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    MessageAttributes: {
      severity: {
        DataType: 'String',
        StringValue: alert.severity,
      },
      type: {
        DataType: 'String',
        StringValue: alert.type,
      },
    },
  });

  try {
    await snsClient.send(command);
    logger.debug('Published to SNS', { alertId: alert.id });
  } catch (error) {
    logger.error('Failed to publish to SNS', { alertId: alert.id, error });
    // Don't throw - alert is already stored
  }
}

export async function getAlerts(accountId: string, limit: number = 50): Promise<Alert[]> {
  const command = new QueryCommand({
    TableName: ALERTS_TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `ACCOUNT#${accountId}`,
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  });

  const result = await dynamoClient.send(command);
  return (result.Items || []) as Alert[];
}

export async function acknowledgeAlert(alertId: string, accountId: string): Promise<void> {
  // TODO: Implement update logic
  logger.info('Acknowledging alert', { alertId, accountId });
}

// Lambda handler for SQS/EventBridge events
export async function handler(event: { Records?: Array<{ body: string }> }): Promise<void> {
  if (event.Records) {
    for (const record of event.Records) {
      const alertInput = JSON.parse(record.body) as SendAlertInput;
      await sendAlert(alertInput);
    }
  }
}
