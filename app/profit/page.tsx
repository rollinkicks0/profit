'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../components/Navigation';

type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisweek' | 'thismonth' | 'thisyear';

interface ProfitData {
  success: boolean;
  dateRange: string;
  startDate: string;
  endDate: string;
  currency: string;
  revenue: string;
  costOfGoods: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
  ordersCount: number;
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
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Profit Calculator</h1>
          <p className="text-sm text-gray-600">Store: {shop}</p>
        </div>
      </div>

      <Navigation />

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
              </p>
            </div>

            {/* Profit Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Gross Profit Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Gross Profit</h2>
                  <p className="text-blue-100 text-sm">Revenue - Cost of Goods</p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-600">Total Revenue (Sales)</span>
                    <span className="text-lg font-bold text-green-600">
                      {profitData.currency} {profitData.revenue}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-600">Cost of Goods Sold</span>
                    <span className="text-lg font-bold text-red-600">
                      - {profitData.currency} {profitData.costOfGoods}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-semibold text-gray-800">Gross Profit</span>
                    <span className={`text-3xl font-bold ${
                      parseFloat(profitData.grossProfit) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profitData.currency} {profitData.grossProfit}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 mt-4">
                    <p className="text-sm text-gray-600 text-center">
                      Based on <strong>{profitData.ordersCount} orders</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Net Profit Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Net Profit</h2>
                  <p className="text-purple-100 text-sm">Gross Profit - Expenses</p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-600">Gross Profit</span>
                    <span className="text-lg font-bold text-green-600">
                      {profitData.currency} {profitData.grossProfit}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <span className="text-gray-600">Total Expenses</span>
                    <span className="text-lg font-bold text-red-600">
                      - {profitData.currency} {profitData.expenses}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-semibold text-gray-800">Net Profit</span>
                    <span className={`text-3xl font-bold ${
                      parseFloat(profitData.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {profitData.currency} {profitData.netProfit}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 mt-4">
                    <p className="text-sm text-gray-600 text-center">
                      Includes <strong>{profitData.expensesCount} expenses</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-4 text-white">
                <p className="text-sm opacity-90">Revenue</p>
                <p className="text-2xl font-bold">{profitData.currency} {profitData.revenue}</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md p-4 text-white">
                <p className="text-sm opacity-90">COGS</p>
                <p className="text-2xl font-bold">{profitData.currency} {profitData.costOfGoods}</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-4 text-white">
                <p className="text-sm opacity-90">Expenses</p>
                <p className="text-2xl font-bold">{profitData.currency} {profitData.expenses}</p>
              </div>
              
              <div className={`bg-gradient-to-br ${
                parseFloat(profitData.netProfit) >= 0 
                  ? 'from-emerald-500 to-emerald-600' 
                  : 'from-rose-500 to-rose-600'
              } rounded-lg shadow-md p-4 text-white`}>
                <p className="text-sm opacity-90">Net Profit</p>
                <p className="text-2xl font-bold">{profitData.currency} {profitData.netProfit}</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">How It's Calculated</h3>
              <div className="space-y-2 text-purple-800">
                <p><strong>Gross Profit</strong> = Total Sales Revenue - Cost of Goods Sold</p>
                <p><strong>Net Profit</strong> = Gross Profit - Total Expenses</p>
                <p className="text-sm text-purple-600 mt-4">
                  * Make sure product costs are set in Shopify Admin → Products → Inventory for accurate calculations
                </p>
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

