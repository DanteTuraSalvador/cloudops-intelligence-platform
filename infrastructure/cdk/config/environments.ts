export interface EnvironmentConfig {
  name: string;
  account?: string;
  region: string;
  isProd: boolean;
  domainName?: string;
  dynamoDbBillingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
  lambdaMemorySize: number;
  lambdaTimeout: number;
  enableXray: boolean;
  retentionDays: number;
}

export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    name: 'dev',
    region: 'us-east-1',
    isProd: false,
    dynamoDbBillingMode: 'PAY_PER_REQUEST',
    lambdaMemorySize: 256,
    lambdaTimeout: 30,
    enableXray: true,
    retentionDays: 7,
  },
  staging: {
    name: 'staging',
    region: 'us-east-1',
    isProd: false,
    dynamoDbBillingMode: 'PAY_PER_REQUEST',
    lambdaMemorySize: 512,
    lambdaTimeout: 30,
    enableXray: true,
    retentionDays: 14,
  },
  prod: {
    name: 'prod',
    region: 'us-east-1',
    isProd: true,
    dynamoDbBillingMode: 'PAY_PER_REQUEST',
    lambdaMemorySize: 1024,
    lambdaTimeout: 30,
    enableXray: true,
    retentionDays: 90,
  },
};

export function getEnvironmentConfig(envName: string): EnvironmentConfig {
  const config = environments[envName];
  if (!config) {
    throw new Error(`Unknown environment: ${envName}. Valid options: ${Object.keys(environments).join(', ')}`);
  }
  return config;
}
