'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import type { MetricType } from '@cloudops/types';

const ACCOUNT_ID = 'demo-account';

export default function MetricsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [metricType, setMetricType] = useState<MetricType>('CPUUtilization');

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setIsLoading(true);
        const data = await apiClient.getMetrics({
          accountId: ACCOUNT_ID,
          metricType,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
          limit: 50,
        });
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [metricType]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Metrics</h1>
        <p className="text-gray-500 mt-1">Monitor your infrastructure metrics</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Metric Type</h3>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as MetricType)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="CPUUtilization">CPU Utilization</option>
            <option value="NetworkIn">Network In</option>
            <option value="NetworkOut">Network Out</option>
            <option value="DiskReadOps">Disk Read Ops</option>
            <option value="DiskWriteOps">Disk Write Ops</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">Current Value</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {metrics.length > 0 ? metrics[0].value.toFixed(2) : '0'}
                  {metrics.length > 0 && metrics[0].unit === 'Percent' && '%'}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900">Average</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {metrics.length > 0
                    ? (metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length).toFixed(2)
                    : '0'}
                  {metrics.length > 0 && metrics[0].unit === 'Percent' && '%'}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-900">Data Points</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.length}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Namespace
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.map((metric, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(metric.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {metric.value.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.dimensions?.namespace || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
