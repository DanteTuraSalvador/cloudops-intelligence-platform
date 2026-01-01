import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { metricsRouter } from './metrics.js';

const app = express();
app.use(express.json());
app.use('/api/v1/metrics', metricsRouter);

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb');
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({
        Items: [
          {
            pk: 'test-account#CPUUtilization',
            sk: '2024-01-01T00:00:00Z',
            accountId: 'test-account',
            metricType: 'CPUUtilization',
            value: 45.5,
            unit: 'Percent',
            expiresAt: 1234567890,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    })),
  },
  QueryCommand: vi.fn(),
}));

describe('Metrics Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/metrics', () => {
    it('should return metrics for valid query', async () => {
      const response = await request(app)
        .get('/api/v1/metrics')
        .query({
          accountId: 'test-account',
          metricType: 'CPUUtilization',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .get('/api/v1/metrics')
        .query({
          accountId: 'test-account',
          // Missing required params
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/metrics/:metricType', () => {
    it('should return metrics for specific type', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/CPUUtilization')
        .query({
          accountId: 'test-account',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/metrics', () => {
    it('should store a metric', async () => {
      const metric = {
        pk: 'test-account#CPUUtilization',
        sk: '2024-01-01T00:00:00Z',
        accountId: 'test-account',
        metricType: 'CPUUtilization',
        value: 50.0,
        unit: 'Percent',
      };

      const response = await request(app)
        .post('/api/v1/metrics')
        .send(metric);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
