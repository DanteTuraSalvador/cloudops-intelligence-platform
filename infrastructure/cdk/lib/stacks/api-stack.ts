import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  metricsTable: dynamodb.Table;
  costsTable: dynamodb.Table;
  alertsTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, metricsTable, costsTable, alertsTable } = props;

    // ========================================================================
    // API Gateway
    // ========================================================================

    this.api = new apigateway.RestApi(this, 'CloudOpsApi', {
      restApiName: `cloudops-api-${config.name}`,
      description: 'CloudOps Intelligence Platform API',
      deployOptions: {
        stageName: config.name,
        tracingEnabled: config.enableXray,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: !config.isProd,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Common Lambda configuration
    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: config.lambdaMemorySize,
      timeout: cdk.Duration.seconds(config.lambdaTimeout),
      tracing: config.enableXray ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        NODE_ENV: config.isProd ? 'production' : 'development',
        METRICS_TABLE: metricsTable.tableName,
        COSTS_TABLE: costsTable.tableName,
        ALERTS_TABLE: alertsTable.tableName,
      },
      bundling: {
        minify: config.isProd,
        sourceMap: !config.isProd,
      },
    };

    // ========================================================================
    // Health Check Lambda
    // ========================================================================

    const healthHandler = new lambdaNode.NodejsFunction(this, 'HealthHandler', {
      ...lambdaDefaults,
      functionName: `cloudops-health-${config.name}`,
      entry: path.join(__dirname, '../../../../services/api-gateway/src/handlers/health.ts'),
      handler: 'handler',
    });

    // ========================================================================
    // Metrics Lambda
    // ========================================================================

    const metricsHandler = new lambdaNode.NodejsFunction(this, 'MetricsHandler', {
      ...lambdaDefaults,
      functionName: `cloudops-metrics-${config.name}`,
      entry: path.join(__dirname, '../../../../services/api-gateway/src/handlers/metrics.ts'),
      handler: 'handler',
    });
    metricsTable.grantReadData(metricsHandler);

    // ========================================================================
    // Costs Lambda
    // ========================================================================

    const costsHandler = new lambdaNode.NodejsFunction(this, 'CostsHandler', {
      ...lambdaDefaults,
      functionName: `cloudops-costs-${config.name}`,
      entry: path.join(__dirname, '../../../../services/api-gateway/src/handlers/costs.ts'),
      handler: 'handler',
    });
    costsTable.grantReadData(costsHandler);

    // ========================================================================
    // API Routes
    // ========================================================================

    // Health endpoint
    const health = this.api.root.addResource('health');
    health.addMethod('GET', new apigateway.LambdaIntegration(healthHandler));

    // Metrics endpoints
    const metrics = this.api.root.addResource('metrics');
    metrics.addMethod('GET', new apigateway.LambdaIntegration(metricsHandler));

    const metricsById = metrics.addResource('{accountId}');
    metricsById.addMethod('GET', new apigateway.LambdaIntegration(metricsHandler));

    // Costs endpoints
    const costs = this.api.root.addResource('costs');
    costs.addMethod('GET', new apigateway.LambdaIntegration(costsHandler));

    const costsById = costs.addResource('{accountId}');
    costsById.addMethod('GET', new apigateway.LambdaIntegration(costsHandler));

    // Store API URL
    this.apiUrl = this.api.url;

    // ========================================================================
    // Outputs
    // ========================================================================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
    });
  }
}
