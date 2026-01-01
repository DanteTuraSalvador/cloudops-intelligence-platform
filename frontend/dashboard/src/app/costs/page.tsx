'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';

const ACCOUNT_ID = 'demo-account';

export default function CostsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [costs, setCosts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCosts() {
      try {
        setIsLoading(true);
        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const data = await apiClient.getCosts({
          accountId: ACCOUNT_ID,
          startDate,
          endDate,
        });
        setCosts(data);
      } catch (err) {
        console.error('Failed to fetch costs:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCosts();
  }, []);

  const totalCost = costs.reduce((sum, cost) => sum + cost.totalCost, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cost Analysis</h1>
        <p className="text-gray-500 mt-1">Track and analyze your cloud spending</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Cost (Last 30 Days)</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">${totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Daily Average</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            ${costs.length > 0 ? (totalCost / costs.length).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Days Tracked</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{costs.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Cost Breakdown</h3>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Services
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {costs.map((cost, idx) => {
                  const topService = cost.breakdown.reduce((max: any, item: any) =>
                    item.cost > (max?.cost || 0) ? item : max
                  , null);

                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cost.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${cost.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {topService ? `${topService.service} ($${topService.cost.toFixed(2)})` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {cost.breakdown.map((item: any, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {item.service}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
