import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';

export interface MonitoringStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  api: apigateway.RestApi;
  metricsTable: dynamodb.Table;
}

export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config, api, metricsTable } = props;

    // SNS Topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `cloudops-alarms-${config.name}`,
      displayName: 'CloudOps Alarm Notifications',
    });

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'CloudOpsDashboard', {
      dashboardName: `CloudOps-${config.name}`,
    });

    // API Gateway Metrics
    const apiRequestsWidget = new cloudwatch.GraphWidget({
      title: 'API Requests',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });

    const apiLatencyWidget = new cloudwatch.GraphWidget({
      title: 'API Latency',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(1),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          statistic: 'p99',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });

    const apiErrorsWidget = new cloudwatch.GraphWidget({
      title: 'API Errors',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });

    // DynamoDB Metrics
    const dynamoReadWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB Read Capacity',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedReadCapacityUnits',
          dimensionsMap: {
            TableName: metricsTable.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });

    const dynamoWriteWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB Write Capacity',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedWriteCapacityUnits',
          dimensionsMap: {
            TableName: metricsTable.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });

    const dynamoThrottleWidget = new cloudwatch.GraphWidget({
      title: 'DynamoDB Throttled Requests',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ReadThrottleEvents',
          dimensionsMap: {
            TableName: metricsTable.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'WriteThrottleEvents',
          dimensionsMap: {
            TableName: metricsTable.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(apiRequestsWidget, apiLatencyWidget);
    this.dashboard.addWidgets(apiErrorsWidget, dynamoReadWidget);
    this.dashboard.addWidgets(dynamoWriteWidget, dynamoThrottleWidget);

    // Alarms

    // High Error Rate Alarm
    const errorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: `cloudops-high-error-rate-${config.name}`,
      alarmDescription: 'API error rate is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: api.restApiName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    errorRateAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // High Latency Alarm
    const latencyAlarm = new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      alarmName: `cloudops-high-latency-${config.name}`,
      alarmDescription: 'API latency is too high',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: api.restApiName,
        },
        statistic: 'p99',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 3000, // 3 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    latencyAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // DynamoDB Throttle Alarm
    const throttleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
      alarmName: `cloudops-dynamo-throttle-${config.name}`,
      alarmDescription: 'DynamoDB is being throttled',
      metric: new cloudwatch.MathExpression({
        expression: 'readThrottle + writeThrottle',
        usingMetrics: {
          readThrottle: new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ReadThrottleEvents',
            dimensionsMap: {
              TableName: metricsTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          writeThrottle: new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'WriteThrottleEvents',
            dimensionsMap: {
              TableName: metricsTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        },
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    throttleAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Outputs
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS topic for CloudWatch alarms',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch dashboard URL',
    });
  }
}
