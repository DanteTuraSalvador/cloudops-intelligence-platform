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
    const tables = await client.send(new ListTablesCommand({}));
    console.log('Existing tables:', tables.TableNames || []);

    if (!tables.TableNames || !tables.TableNames.includes('cloudops-metrics')) {
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
      console.log('✓ cloudops-metrics created');
    } else {
      console.log('✓ cloudops-metrics exists');
    }

    if (!tables.TableNames || !tables.TableNames.includes('cloudops-costs')) {
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
      console.log('✓ cloudops-costs created');
    } else {
      console.log('✓ cloudops-costs exists');
    }

    console.log('\nAll tables ready!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTables();
