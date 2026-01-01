import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

interface StorageStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class StorageStack extends cdk.Stack {
  public readonly metricsTable: dynamodb.Table;
  public readonly costsTable: dynamodb.Table;
  public readonly alertsTable: dynamodb.Table;
  public readonly dataLakeBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { config } = props;
    const removalPolicy = config.isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // ========================================================================
    // DynamoDB Tables
    // ========================================================================

    // Metrics Table (following ADR-001)
    this.metricsTable = new dynamodb.Table(this, 'MetricsTable', {
      tableName: `cloudops-metrics-${config.name}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy,
      pointInTimeRecovery: config.isProd,
    });

    // GSI for querying by metric type
    this.metricsTable.addGlobalSecondaryIndex({
      indexName: 'MetricTypeIndex',
      partitionKey: { name: 'metricType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Costs Table
    this.costsTable = new dynamodb.Table(this, 'CostsTable', {
      tableName: `cloudops-costs-${config.name}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy,
      pointInTimeRecovery: config.isProd,
    });

    // Alerts Table
    this.alertsTable = new dynamodb.Table(this, 'AlertsTable', {
      tableName: `cloudops-alerts-${config.name}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    });

    // GSI for querying by status
    this.alertsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================================================
    // S3 Buckets
    // ========================================================================

    // Data Lake Bucket
    this.dataLakeBucket = new s3.Bucket(this, 'DataLakeBucket', {
      bucketName: `cloudops-data-lake-${config.name}-${this.account}`,
      removalPolicy,
      autoDeleteObjects: !config.isProd,
      versioned: config.isProd,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
        {
          id: 'ExpireOldData',
          expiration: cdk.Duration.days(365),
          enabled: !config.isProd,
        },
      ],
    });

    // ========================================================================
    // Outputs
    // ========================================================================

    new cdk.CfnOutput(this, 'MetricsTableName', {
      value: this.metricsTable.tableName,
      description: 'DynamoDB Metrics Table Name',
    });

    new cdk.CfnOutput(this, 'CostsTableName', {
      value: this.costsTable.tableName,
      description: 'DynamoDB Costs Table Name',
    });

    new cdk.CfnOutput(this, 'DataLakeBucketName', {
      value: this.dataLakeBucket.bucketName,
      description: 'S3 Data Lake Bucket Name',
    });
  }
}
