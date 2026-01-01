import type { ApiResponse, Metric, CostData, MetricQuery, CostQuery } from '@cloudops/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Metrics endpoints
  async getMetrics(query: MetricQuery & { metricType: string }): Promise<Metric[]> {
    const params = new URLSearchParams();
    params.append('accountId', query.accountId);
    params.append('metricType', query.metricType);
    params.append('startTime', query.startTime);
    params.append('endTime', query.endTime);
    if (query.limit) {
      params.append('limit', query.limit.toString());
    }

    const response = await this.request<Metric[]>(`/api/v1/metrics?${params}`);
    return response.data || [];
  }

  async getMetricsByType(metricType: string, accountId: string, startTime: string, endTime: string): Promise<Metric[]> {
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    params.append('startTime', startTime);
    params.append('endTime', endTime);

    const response = await this.request<Metric[]>(`/api/v1/metrics/${metricType}?${params}`);
    return response.data || [];
  }

  // Costs endpoints
  async getCosts(query: CostQuery): Promise<CostData[]> {
    const params = new URLSearchParams();
    params.append('accountId', query.accountId);
    params.append('startDate', query.startDate);
    params.append('endDate', query.endDate);

    const response = await this.request<CostData[]>(`/api/v1/costs?${params}`);
    return response.data || [];
  }

  async getCostSummary(accountId: string, period: string = 'monthly'): Promise<any> {
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    params.append('period', period);
    const response = await this.request<any>(`/api/v1/costs/summary?${params}`);
    return response.data || {};
  }

  async getCostForecast(accountId: string, months: number = 3): Promise<any> {
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    params.append('months', months.toString());
    const response = await this.request<any>(`/api/v1/costs/forecast?${params}`);
    return response.data || {};
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.request<any>('/health');
    return response.data || response;
  }

  // AI Insights
  async getInsights(): Promise<any> {
    const response = await this.request<any>('/api/v1/insights');
    return response.data || {};
  }
}

export const apiClient = new ApiClient();
export default apiClient;
