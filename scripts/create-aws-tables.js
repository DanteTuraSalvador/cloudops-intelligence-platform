import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

// Use your AWS region
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

async function createTables() {
  try {
    console.log('Checking existing tables in AWS...');
    const tables = await client.send(new ListTablesCommand({}));
    console.log('Existing tables:', tables.TableNames || []);

    // Create metrics table
    if (!tables.TableNames || !tables.TableNames.includes('cloudops-metrics')) {
      console.log('\nCreating cloudops-metrics table in AWS...');
      await client.send(new CreateTableCommand({
        TableName: 'cloudops-metrics',
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        BillingMode: 'PAY_PER_REQUEST', // No charge for low usage
      }));
      console.log('✓ cloudops-metrics created');
    } else {
      console.log('✓ cloudops-metrics already exists');
    }

    // Create costs table
    if (!tables.TableNames || !tables.TableNames.includes('cloudops-costs')) {
      console.log('\nCreating cloudops-costs table in AWS...');
      await client.send(new CreateTableCommand({
        TableName: 'cloudops-costs',
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        BillingMode: 'PAY_PER_REQUEST', // No charge for low usage
      }));
      console.log('✓ cloudops-costs created');
    } else {
      console.log('✓ cloudops-costs already exists');
    }

    console.log('\n✅ All tables ready in AWS DynamoDB!');
    console.log('Region: ap-southeast-2');
    console.log('Billing: PAY_PER_REQUEST (Free tier eligible)');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure you have:');
    console.log('1. AWS credentials configured (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)');
    console.log('2. Permissions to create DynamoDB tables');
    console.log('3. Correct region set (ap-southeast-2)');
  }
}

createTables();
