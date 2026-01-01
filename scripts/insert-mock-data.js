import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: 'ap-southeast-2',
}));

async function insertMockData() {
  console.log('Inserting mock data into DynamoDB...');

  const accountId = 'demo-account';
  const now = new Date();

  // Insert metrics
  const metricTypes = ['CPUUtilization', 'NetworkIn', 'NetworkOut', 'DiskReadOps', 'DiskWriteOps'];

  for (const metricType of metricTypes) {
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000); // Every 5 minutes
      const value = Math.random() * 100;

      await client.send(new PutCommand({
        TableName: 'cloudops-metrics',
        Item: {
          pk: `${accountId}#${metricType}`,
          sk: timestamp.toISOString(),
          accountId,
          metricType,
          value,
          unit: metricType === 'CPUUtilization' ? 'Percent' : metricType.includes('Network') ? 'Bytes' : 'Count',
          dimensions: {
            namespace: 'AWS/EC2',
          },
          timestamp: timestamp.toISOString(),
          ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
        },
      }));
    }
    console.log(`✓ Inserted metrics for ${metricType}`);
  }

  // Insert costs
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    await client.send(new PutCommand({
      TableName: 'cloudops-costs',
      Item: {
        pk: `${accountId}#cost`,
        sk: dateStr,
        accountId,
        date: dateStr,
        totalCost: 150 + Math.random() * 50,
        currency: 'USD',
        breakdown: [
          { service: 'EC2', cost: 50 + Math.random() * 20 },
          { service: 'RDS', cost: 30 + Math.random() * 10 },
          { service: 'S3', cost: 20 + Math.random() * 10 },
          { service: 'Lambda', cost: 15 + Math.random() * 5 },
          { service: 'DynamoDB', cost: 10 + Math.random() * 5 },
        ],
        timestamp: date.toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
      },
    }));
    console.log(`✓ Inserted costs for ${dateStr}`);
  }

  console.log('\n✅ Mock data inserted successfully!');
  console.log('You can now query the API and see data in the dashboard.');
}

insertMockData().catch(console.error);
