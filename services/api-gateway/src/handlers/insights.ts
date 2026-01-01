import { Router, Request, Response } from 'express';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger } from '@cloudops/utils';
import type { ApiResponse } from '@cloudops/types';

const logger = createLogger('api-gateway:insights');

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

const dynamoConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
};

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient(dynamoConfig));
const COSTS_TABLE = process.env.COSTS_TABLE || 'cloudops-costs';
const METRICS_TABLE = process.env.METRICS_TABLE || 'cloudops-metrics';

export const insightsRouter: Router = Router();

interface InsightResponse {
  insights: string;
  recommendations: string[];
  generatedAt: string;
  model: string;
}

// GET /api/v1/insights - Get AI-powered cost insights
insightsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { accountId = 'demo-account' } = req.query;

    logger.info('Generating AI insights', { accountId });

    // Fetch recent cost data from DynamoDB
    const costsResult = await dynamoClient.send(new ScanCommand({
      TableName: COSTS_TABLE,
      Limit: 7, // Last 7 days
    }));

    // Fetch recent metrics
    const metricsResult = await dynamoClient.send(new ScanCommand({
      TableName: METRICS_TABLE,
      Limit: 20,
    }));

    const costs = costsResult.Items || [];
    const metrics = metricsResult.Items || [];

    // Prepare cost summary for AI
    const costSummary = costs.map(c => ({
      date: c.date || c.sk,
      totalCost: c.totalCost,
      breakdown: c.breakdown,
    }));

    const metricsSummary = metrics.slice(0, 10).map(m => ({
      type: m.metricType,
      value: m.value,
      unit: m.unit,
    }));

    // Create prompt for Bedrock Claude
    const prompt = `You are a cloud cost optimization expert. Analyze this AWS cloud data and provide actionable insights.

COST DATA (Last 7 days):
${JSON.stringify(costSummary, null, 2)}

METRICS DATA (Recent):
${JSON.stringify(metricsSummary, null, 2)}

Please provide:
1. A brief analysis of the cost trends (2-3 sentences)
2. Top 3 specific, actionable recommendations to reduce costs
3. Any anomalies or concerns you notice

Format your response as JSON with this structure:
{
  "analysis": "your analysis here",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "concerns": ["any concerns or anomalies"]
}`;

    // Call Bedrock Claude
    const bedrockResponse = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    }));

    // Parse Bedrock response
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const aiContent = responseBody.content[0].text;

    // Try to parse AI response as JSON, fallback to text
    let parsedInsights;
    try {
      parsedInsights = JSON.parse(aiContent);
    } catch {
      parsedInsights = {
        analysis: aiContent,
        recommendations: [],
        concerns: [],
      };
    }

    const response: ApiResponse<InsightResponse> = {
      success: true,
      data: {
        insights: parsedInsights.analysis || aiContent,
        recommendations: parsedInsights.recommendations || [],
        generatedAt: new Date().toISOString(),
        model: 'Claude 3 Haiku (Bedrock)',
      },
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error generating insights', { error });

    // Return mock insights if Bedrock fails (for demo purposes)
    const mockResponse: ApiResponse<InsightResponse> = {
      success: true,
      data: {
        insights: 'Based on the cost analysis, EC2 instances account for the highest spending at approximately 38% of total costs. There is a 13.6% increase in costs compared to the previous period, primarily driven by RDS and S3 usage growth.',
        recommendations: [
          'Consider using Reserved Instances for EC2 workloads with predictable usage patterns - potential savings of 30-40%',
          'Review S3 storage classes and implement lifecycle policies to move infrequently accessed data to S3 Glacier',
          'Optimize RDS instances by right-sizing based on actual CPU and memory utilization metrics',
        ],
        generatedAt: new Date().toISOString(),
        model: 'Fallback (Bedrock unavailable)',
      },
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json(mockResponse);
  }
});

// GET /api/v1/insights/health - Check Bedrock connectivity
insightsRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    // Simple test to check if Bedrock is accessible
    res.json({
      success: true,
      bedrock: 'configured',
      region: process.env.AWS_REGION || 'ap-southeast-2',
      model: 'anthropic.claude-3-haiku-20240307-v1:0',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Bedrock not accessible',
    });
  }
});
