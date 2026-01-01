'use client';

import { useState } from 'react';

interface Alert {
  id: string;
  type: 'cost' | 'performance' | 'resource' | 'optimization';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  resource: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'performance',
    severity: 'critical',
    title: 'High CPU Utilization',
    message: 'Instance i-1234567890 CPU at 95% for the last 30 minutes',
    resource: 'i-1234567890 (web-server-prod)',
    timestamp: '2 hours ago',
    status: 'active',
  },
  {
    id: '2',
    type: 'cost',
    severity: 'warning',
    title: 'Budget Threshold Exceeded',
    message: 'Monthly spending has reached 75% of allocated budget ($1,875 of $2,500)',
    resource: 'AWS Account - Production',
    timestamp: '5 hours ago',
    status: 'acknowledged',
  },
  {
    id: '3',
    type: 'resource',
    severity: 'info',
    title: 'Auto-Scaling Event',
    message: 'Auto Scaling Group launched 2 new instances due to increased load',
    resource: 'asg-web-tier-prod',
    timestamp: '8 hours ago',
    status: 'resolved',
  },
  {
    id: '4',
    type: 'performance',
    severity: 'warning',
    title: 'Memory Usage High',
    message: 'Database instance memory utilization at 82%',
    resource: 'db-main-prod',
    timestamp: '12 hours ago',
    status: 'acknowledged',
  },
  {
    id: '5',
    type: 'optimization',
    severity: 'info',
    title: 'Rightsizing Opportunity',
    message: 'Instance m5.xlarge has low CPU usage (avg 12%) - consider downsizing to m5.large',
    resource: 'i-9876543210',
    timestamp: '1 day ago',
    status: 'active',
  },
  {
    id: '6',
    type: 'cost',
    severity: 'critical',
    title: 'Unexpected Cost Spike',
    message: 'Lambda invocations increased 300% causing $127 in additional charges',
    resource: 'lambda-data-processor',
    timestamp: '1 day ago',
    status: 'active',
  },
  {
    id: '7',
    type: 'performance',
    severity: 'warning',
    title: 'Disk Space Warning',
    message: 'EBS volume utilization at 85% capacity',
    resource: 'vol-0123456789abcdef',
    timestamp: '2 days ago',
    status: 'resolved',
  },
];

export default function AlertsPage() {
  const [filter, setFilter] = useState<'all' | 'cost' | 'performance' | 'resource' | 'optimization'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');

  const filteredAlerts = mockAlerts.filter(alert => {
    if (filter !== 'all' && alert.type !== filter) return false;
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost': return '💰';
      case 'performance': return '⚡';
      case 'resource': return '🔧';
      case 'optimization': return '💡';
      default: return '🔔';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cost': return 'bg-green-100 text-green-800';
      case 'performance': return 'bg-yellow-100 text-yellow-800';
      case 'resource': return 'bg-blue-100 text-blue-800';
      case 'optimization': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 border-red-200';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeCount = mockAlerts.filter(a => a.status === 'active').length;
  const criticalCount = mockAlerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
        <p className="text-gray-500 mt-1">Monitor and manage your alert rules</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Alerts</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{mockAlerts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">Requires action</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Critical</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{criticalCount}</p>
          <p className="text-xs text-gray-500 mt-1">High priority</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Resolved</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {mockAlerts.filter(a => a.status === 'resolved').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Type</label>
            <div className="flex gap-2 flex-wrap">
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
                onClick={() => setFilter('cost')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === 'cost'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cost
              </button>
              <button
                onClick={() => setFilter('performance')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === 'performance'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setFilter('resource')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === 'resource'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Resource
              </button>
              <button
                onClick={() => setFilter('optimization')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  filter === 'optimization'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Optimization
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  statusFilter === 'active'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('acknowledged')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  statusFilter === 'acknowledged'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Acknowledged
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  statusFilter === 'resolved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getTypeIcon(alert.type)}</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(alert.type)}`}>
                    {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                  </span>
                  <span className={`px-2 py-1 rounded border text-xs font-medium ${getStatusBadge(alert.status)}`}>
                    {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">{alert.timestamp}</span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-1">{alert.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{alert.message}</p>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Resource:</span>
                  <span className="font-mono font-medium text-gray-900">{alert.resource}</span>
                </div>
              </div>

              <div className="ml-4 flex flex-col gap-2">
                {alert.status === 'active' && (
                  <>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                      Acknowledge
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                      Resolve
                    </button>
                  </>
                )}
                {alert.status === 'acknowledged' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    Resolve
                  </button>
                )}
                {alert.status === 'resolved' && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium text-center">
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No alerts found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
