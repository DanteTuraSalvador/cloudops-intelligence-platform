'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';

interface InsightsData {
  insights: string;
  recommendations: string[];
  generatedAt: string;
  model: string;
}

export default function InsightsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InsightsData | null>(null);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const insights = await apiClient.getInsights();
      setData(insights);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError('Failed to generate AI insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Cost Insights</h1>
          <p className="text-gray-500 mt-1">Powered by Amazon Bedrock (Claude 3 Haiku)</p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Analysis
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {isLoading && !data ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-500">AI is analyzing your cloud costs...</p>
            <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* AI Badge */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <h3 className="font-semibold">AI-Powered Analysis</h3>
                <p className="text-sm text-indigo-100">{data.model}</p>
              </div>
            </div>
            <p className="text-lg leading-relaxed">{data.insights}</p>
            <p className="text-sm text-indigo-200 mt-4">
              Generated: {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cost Optimization Recommendations
            </h3>
            <div className="space-y-4">
              {data.recommendations.map((rec, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold">
                    {idx + 1}
                  </span>
                  <p className="text-gray-700 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">About AI Insights</h4>
                <p className="text-sm text-blue-700 mt-1">
                  These insights are generated using Amazon Bedrock&apos;s Claude 3 Haiku model,
                  analyzing your actual cloud cost and metrics data from DynamoDB.
                  Recommendations are tailored to your specific usage patterns.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
