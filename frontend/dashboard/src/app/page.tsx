'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease';
}

interface CostBreakdown {
  service: string;
  cost: number;
  percentage: number;
}

const ACCOUNT_ID = 'demo-account';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricCard[]>([
    { title: 'Total Monthly Cost', value: '$0.00', change: 0, changeType: 'increase' },
    { title: 'Active Resources', value: '0', change: 0, changeType: 'increase' },
    { title: 'Avg CPU Usage', value: '0%', change: 0, changeType: 'decrease' },
    { title: 'Open Alerts', value: '0', change: 0, changeType: 'increase' },
  ]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch cost data for the last 7 days
        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const costData = await apiClient.getCosts({
          accountId: ACCOUNT_ID,
          startDate,
          endDate,
        });

        // Fetch cost summary (unused for now, but available for future use)
        await apiClient.getCostSummary(ACCOUNT_ID, 'monthly');

        // Fetch recent CPU metrics
        const cpuMetrics = await apiClient.getMetrics({
          accountId: ACCOUNT_ID,
          metricType: 'CPUUtilization',
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
          limit: 10,
        });

        // Update metrics cards
        if (costData.length > 0) {
          const latestCost = costData[0];
          const totalCost = latestCost.totalCost;

          const avgCpu = cpuMetrics.length > 0
            ? cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length
            : 0;

          setMetrics([
            { title: 'Total Monthly Cost', value: `$${totalCost.toFixed(2)}`, change: 7.2, changeType: 'increase' },
            { title: 'Active Resources', value: String(latestCost.breakdown.length), change: 3, changeType: 'increase' },
            { title: 'Avg CPU Usage', value: `${avgCpu.toFixed(1)}%`, change: 2.1, changeType: 'decrease' },
            { title: 'Open Alerts', value: '0', change: 0, changeType: 'increase' },
          ]);

          // Update cost breakdown
          const totalBreakdownCost = latestCost.breakdown.reduce((sum, item) => sum + item.cost, 0);
          const breakdown = latestCost.breakdown.map(item => ({
            service: item.service,
            cost: item.cost,
            percentage: (item.cost / totalBreakdownCost) * 100,
          })).slice(0, 5);

          setCostBreakdown(breakdown);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');

        // Use fallback mock data on error
        setMetrics([
          { title: 'Total Monthly Cost', value: '$2,847.50', change: 7.2, changeType: 'increase' },
          { title: 'Active Resources', value: '156', change: 3, changeType: 'increase' },
          { title: 'Avg CPU Usage', value: '45.2%', change: 2.1, changeType: 'decrease' },
          { title: 'Open Alerts', value: '5', change: 2, changeType: 'increase' },
        ]);
        setCostBreakdown([
          { service: 'EC2', cost: 1200, percentage: 42.1 },
          { service: 'RDS', cost: 850, percentage: 29.8 },
          { service: 'Lambda', cost: 450, percentage: 15.8 },
          { service: 'S3', cost: 200, percentage: 7.0 },
          { service: 'Other', cost: 147.5, percentage: 5.3 },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Using demo data: {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Monitor your cloud infrastructure in real-time</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">{metric.title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metric.changeType === 'increase' ? '+' : '-'}
                {metric.change}%
              </span>
              <span className="text-sm text-gray-500 ml-2">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Service</h3>
          <div className="space-y-4">
            {costBreakdown.map((item) => (
              <div key={item.service}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.service}</span>
                  <span className="text-gray-500">
                    ${item.cost.toFixed(2)} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            <AlertItem
              severity="critical"
              title="High CPU Utilization"
              description="Instance i-1234567890 CPU at 95%"
              time="2 hours ago"
            />
            <AlertItem
              severity="warning"
              title="Budget Threshold"
              description="Monthly spending at 75% of budget"
              time="5 hours ago"
            />
            <AlertItem
              severity="info"
              title="New Recommendation"
              description="Rightsize opportunity for m5.xlarge"
              time="1 day ago"
            />
          </div>
          <button className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700">
            View all alerts →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionCard
            icon="chart"
            title="View Metrics"
            description="Detailed resource metrics"
          />
          <ActionCard
            icon="dollar"
            title="Cost Analysis"
            description="Analyze spending patterns"
          />
          <ActionCard
            icon="alert"
            title="Manage Alerts"
            description="Configure alert rules"
          />
          <ActionCard
            icon="lightbulb"
            title="Recommendations"
            description="Optimization opportunities"
          />
        </div>
      </div>
    </div>
  );
}

function AlertItem({
  severity,
  title,
  description,
  time,
}: {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
}) {
  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[severity]}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs mt-1 opacity-80">{description}</p>
        </div>
        <span className="text-xs opacity-60">{time}</span>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <button className="p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left">
      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-3">
        <span className="text-indigo-600">
          {icon === 'chart' && '📊'}
          {icon === 'dollar' && '💰'}
          {icon === 'alert' && '🔔'}
          {icon === 'lightbulb' && '💡'}
        </span>
      </div>
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </button>
  );
}
