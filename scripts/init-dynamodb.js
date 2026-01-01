const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

async function createTables() {
  try {
    // List existing tables
    const listResult = await client.send(new ListTablesCommand({}));
    console.log('Existing tables:', listResult.TableNames);

    // Create metrics table
    if (!listResult.TableNames.includes('cloudops-metrics')) {
      console.log('Creating cloudops-metrics table...');
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
        BillingMode: 'PAY_PER_REQUEST',
      }));
      console.log('✓ cloudops-metrics table created');
    } else {
      console.log('✓ cloudops-metrics table already exists');
    }

    // Create costs table
    if (!listResult.TableNames.includes('cloudops-costs')) {
      console.log('Creating cloudops-costs table...');
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
        BillingMode: 'PAY_PER_REQUEST',
      }));
      console.log('✓ cloudops-costs table created');
    } else {
      console.log('✓ cloudops-costs table already exists');
    }

    console.log('\nAll tables ready!');
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createTables();
