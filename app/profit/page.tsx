'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';

type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisweek' | 'thismonth' | 'thisyear';

interface ProfitData {
  success: boolean;
  dateRange: string;
  startDate: string;
  endDate: string;
  currency: string;
  ordersCount: number;
  revenue: string;
  costOfGoods: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
  expensesCount: number;
}

function ProfitContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop');
  
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('today');

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisweek', label: 'This Week' },
    { value: 'thismonth', label: 'This Month' },
    { value: 'thisyear', label: 'This Year' },
  ];

  useEffect(() => {
    if (shop) {
      fetchProfit();
    }
  }, [shop, dateRange]);

  const fetchProfit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/profit?shop=${shop}&dateRange=${dateRange}`
      );
      const data = await response.json();
      
      if (data.success) {
        setProfitData(data);
      } else {
        setError(data.error || 'Failed to calculate profit');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-600">Please connect your store first</p>
        </div>
      </div>
    );
  }

  const selectedLabel = dateRangeOptions.find(opt => opt.value === dateRange)?.label || 'Today';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time Period
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={fetchProfit}
              className="ml-4 mt-6 bg-purple-600 text-white py-2 px-6 rounded-md hover:bg-purple-700 transition-colors"
            >
              Calculate
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Calculating profit...</p>
          </div>
        ) : profitData && (
          <>
            {/* Date Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-center">
                <strong>Period:</strong> {selectedLabel} ({profitData.startDate} to {profitData.endDate})
                <span className="ml-4 text-gray-700">• {profitData.ordersCount} orders</span>
              </p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Total Sales</p>
                <p className="text-3xl font-bold">{profitData.currency} {profitData.revenue}</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Cost of Goods</p>
                <p className="text-3xl font-bold">{profitData.currency} {profitData.costOfGoods}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Gross Profit</p>
                <p className="text-3xl font-bold">{profitData.currency} {profitData.grossProfit}</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Expenses</p>
                <p className="text-3xl font-bold">{profitData.currency} {profitData.expenses}</p>
                <p className="text-xs opacity-75 mt-1">{profitData.expensesCount} items</p>
              </div>
            </div>

            {/* Net Profit - Big Card */}
            <div className={`bg-gradient-to-br ${
              parseFloat(profitData.netProfit) >= 0 
                ? 'from-emerald-500 to-emerald-600' 
                : 'from-rose-500 to-rose-600'
            } rounded-xl shadow-2xl p-8 text-white text-center`}>
              <p className="text-xl opacity-90 mb-2">NET PROFIT</p>
              <p className="text-6xl font-bold mb-2">{profitData.currency} {profitData.netProfit}</p>
              <p className="text-sm opacity-75">
                Gross Profit ({profitData.currency} {profitData.grossProfit}) - Expenses ({profitData.currency} {profitData.expenses})
              </p>
            </div>

            {/* Simple Formula */}
            <div className="mt-6 bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">Calculation Breakdown</h3>
              <div className="max-w-2xl mx-auto space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-700">Revenue (Sales)</span>
                  <span className="font-bold text-blue-600">{profitData.currency} {profitData.revenue}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-700">- Cost of Goods Sold</span>
                  <span className="font-bold text-red-600">- {profitData.currency} {profitData.costOfGoods}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                  <span className="font-semibold text-gray-800">= Gross Profit</span>
                  <span className="font-bold text-green-600">{profitData.currency} {profitData.grossProfit}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-700">- Expenses</span>
                  <span className="font-bold text-orange-600">- {profitData.currency} {profitData.expenses}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-100 to-purple-50 border-2 border-purple-300 rounded-lg">
                  <span className="font-bold text-gray-900">= NET PROFIT</span>
                  <span className={`text-2xl font-bold ${
                    parseFloat(profitData.netProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {profitData.currency} {profitData.netProfit}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ProfitContent />
    </Suspense>
  );
}

