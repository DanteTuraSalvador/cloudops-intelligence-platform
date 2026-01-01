'use client';

import { useState } from 'react';

interface Anomaly {
  id: string;
  type: 'metric' | 'cost';
  severity: 'critical' | 'warning' | 'info';
  resource: string;
  metric: string;
  description: string;
  detectedAt: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
}

const mockAnomalies: Anomaly[] = [
  {
    id: '1',
    type: 'metric',
    severity: 'critical',
    resource: 'i-0a1b2c3d4e5f6g7h8',
    metric: 'CPU Utilization',
    description: 'Sustained high CPU usage detected',
    detectedAt: '2 hours ago',
    expectedValue: 45,
    actualValue: 95,
    deviation: 111,
  },
  {
    id: '2',
    type: 'cost',
    severity: 'warning',
    resource: 'AWS Lambda',
    metric: 'Daily Cost',
    description: 'Unexpected cost spike in Lambda invocations',
    detectedAt: '5 hours ago',
    expectedValue: 12.5,
    actualValue: 47.8,
    deviation: 282,
  },
  {
    id: '3',
    type: 'metric',
    severity: 'warning',
    resource: 'db-main-prod',
    metric: 'Disk I/O',
    description: 'Unusual disk read/write pattern',
    detectedAt: '8 hours ago',
    expectedValue: 1200,
    actualValue: 3850,
    deviation: 221,
  },
  {
    id: '4',
    type: 'cost',
    severity: 'info',
    resource: 'S3 Bucket',
    metric: 'Storage Cost',
    description: 'Gradual increase in storage costs detected',
    detectedAt: '1 day ago',
    expectedValue: 8.2,
    actualValue: 12.1,
    deviation: 48,
  },
  {
    id: '5',
    type: 'metric',
    severity: 'critical',
    resource: 'web-server-cluster',
    metric: 'Memory Usage',
    description: 'Memory leak suspected - continuous growth',
    detectedAt: '3 hours ago',
    expectedValue: 65,
    actualValue: 92,
    deviation: 42,
  },
];

export default function AnomaliesPage() {
  const [filter, setFilter] = useState<'all' | 'metric' | 'cost'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredAnomalies = mockAnomalies.filter(anomaly => {
    if (filter !== 'all' && anomaly.type !== filter) return false;
    if (severityFilter !== 'all' && anomaly.severity !== severityFilter) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Anomaly Detection</h1>
        <p className="text-gray-500 mt-1">Identify unusual patterns in your infrastructure</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Anomalies</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{mockAnomalies.length}</p>
          <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Critical</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {mockAnomalies.filter(a => a.severity === 'critical').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Warnings</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">
            {mockAnomalies.filter(a => a.severity === 'warning').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Monitor closely</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Avg Deviation</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {Math.round(mockAnomalies.reduce((sum, a) => sum + a.deviation, 0) / mockAnomalies.length)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">From baseline</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('metric')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === 'metric'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Metrics
              </button>
              <button
                onClick={() => setFilter('cost')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === 'cost'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Costs
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Severity</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  severityFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSeverityFilter('critical')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  severityFilter === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setSeverityFilter('warning')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  severityFilter === 'warning'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Warning
              </button>
              <button
                onClick={() => setSeverityFilter('info')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  severityFilter === 'info'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Info
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {filteredAnomalies.map((anomaly) => (
          <div
            key={anomaly.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getSeverityColor(anomaly.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityBadge(anomaly.severity)}`}>
                    {anomaly.severity.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {anomaly.type === 'metric' ? 'Metric Anomaly' : 'Cost Anomaly'}
                  </span>
                  <span className="text-sm text-gray-500">{anomaly.detectedAt}</span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-1">{anomaly.description}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Resource</p>
                    <p className="font-mono text-sm font-medium text-gray-900">{anomaly.resource}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Metric</p>
                    <p className="font-medium text-sm text-gray-900">{anomaly.metric}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected Value</p>
                    <p className="font-medium text-sm text-gray-900">
                      {anomaly.expectedValue.toFixed(1)}
                      {anomaly.type === 'cost' ? ' USD' : anomaly.metric.includes('CPU') || anomaly.metric.includes('Memory') ? '%' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Actual Value</p>
                    <p className="font-medium text-sm text-red-600">
                      {anomaly.actualValue.toFixed(1)}
                      {anomaly.type === 'cost' ? ' USD' : anomaly.metric.includes('CPU') || anomaly.metric.includes('Memory') ? '%' : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        anomaly.deviation > 100 ? 'bg-red-500' : anomaly.deviation > 50 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(anomaly.deviation, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {anomaly.deviation}% deviation
                  </span>
                </div>
              </div>

              <div className="ml-4">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  Investigate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAnomalies.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No anomalies found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
