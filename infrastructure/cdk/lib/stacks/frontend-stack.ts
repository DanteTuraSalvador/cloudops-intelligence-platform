import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../config/environments';
import * as path from 'path';

interface FrontendStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  apiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { config } = props;
    const removalPolicy = config.isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // ========================================================================
    // S3 Bucket for Static Hosting
    // ========================================================================

    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `cloudops-dashboard-${config.name}-${this.account}`,
      removalPolicy,
      autoDeleteObjects: !config.isProd,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ========================================================================
    // CloudFront Distribution
    // ========================================================================

    // Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for CloudOps Dashboard (${config.name})`,
    });

    this.bucket.grantRead(oai);

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `CloudOps Dashboard (${config.name})`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: config.isProd
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    this.distributionUrl = `https://${this.distribution.distributionDomainName}`;

    // ========================================================================
    // S3 Deployment (only for non-prod with existing build)
    // ========================================================================

    // Note: In production, deployment happens via CI/CD
    // This is a placeholder that will fail if the build doesn't exist
    // which is expected - build happens in CI/CD

    // ========================================================================
    // Outputs
    // ========================================================================

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 Bucket Name for Dashboard',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Domain Name',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: this.distributionUrl,
      description: 'Dashboard URL',
    });
  }
}
