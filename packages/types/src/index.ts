// CloudOps Intelligence Platform - Shared Types

// ============================================================================
// Metric Types
// ============================================================================

export interface Metric {
  pk: string; // accountId#metricType
  sk: string; // timestamp (ISO 8601)
  accountId: string;
  metricType: MetricType;
  value: number;
  unit: MetricUnit;
  dimensions?: Record<string, string>;
  tags?: Record<string, string>;
  expiresAt: number; // TTL timestamp
  createdAt: string;
}

export type MetricType =
  | 'CPUUtilization'
  | 'MemoryUtilization'
  | 'NetworkIn'
  | 'NetworkOut'
  | 'DiskReadOps'
  | 'DiskWriteOps'
  | 'DatabaseConnections'
  | 'LambdaInvocations'
  | 'LambdaDuration'
  | 'LambdaErrors';

export type MetricUnit =
  | 'Percent'
  | 'Bytes'
  | 'Count'
  | 'Milliseconds'
  | 'Seconds'
  | 'BytesPerSecond';

export interface MetricQuery {
  accountId: string;
  metricType?: MetricType;
  startTime: string;
  endTime: string;
  limit?: number;
}

// ============================================================================
// Cost Types
// ============================================================================

export interface CostData {
  pk: string; // accountId#cost
  sk: string; // date (YYYY-MM-DD)
  accountId: string;
  date: string;
  totalCost: number;
  currency: string;
  breakdown: CostBreakdown[];
  expiresAt: number;
  createdAt: string;
}

export interface CostBreakdown {
  service: string;
  cost: number;
  usage: number;
  unit: string;
}

export interface CostQuery {
  accountId: string;
  startDate: string;
  endDate: string;
}

export interface CostForecast {
  accountId: string;
  forecastDate: string;
  predictedCost: number;
  confidenceLevel: number;
  generatedAt: string;
}

// ============================================================================
// Anomaly Types
// ============================================================================

export interface Anomaly {
  id: string;
  accountId: string;
  metricType: MetricType;
  detectedAt: string;
  severity: AnomalySeverity;
  description: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  status: AnomalyStatus;
  resolvedAt?: string;
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus = 'open' | 'acknowledged' | 'resolved' | 'ignored';

// ============================================================================
// Recommendation Types
// ============================================================================

export interface Recommendation {
  id: string;
  accountId: string;
  type: RecommendationType;
  resourceId: string;
  resourceType: string;
  title: string;
  description: string;
  estimatedSavings: number;
  currency: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  createdAt: string;
  implementedAt?: string;
}

export type RecommendationType =
  | 'rightsize'
  | 'idle_resource'
  | 'reserved_instance'
  | 'savings_plan'
  | 'unused_ebs'
  | 'old_snapshot';

export type RecommendationPriority = 'low' | 'medium' | 'high';
export type RecommendationStatus = 'pending' | 'implemented' | 'dismissed';

// ============================================================================
// Alert Types
// ============================================================================

export interface Alert {
  id: string;
  accountId: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export type AlertType = 'anomaly' | 'budget' | 'threshold' | 'recommendation';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface AlertRule {
  id: string;
  accountId: string;
  name: string;
  type: AlertType;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  metricType?: MetricType;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  threshold: number;
  duration?: number; // minutes
}

export interface AlertAction {
  type: 'email' | 'sns' | 'webhook';
  target: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services?: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down';
  latency?: number;
}

// ============================================================================
// Account Types
// ============================================================================

export interface Account {
  id: string;
  name: string;
  awsAccountId: string;
  region: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export type AccountStatus = 'active' | 'inactive' | 'pending';

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  accounts: string[]; // Account IDs
  createdAt: string;
  lastLoginAt?: string;
}

export type UserRole = 'admin' | 'user' | 'viewer';
