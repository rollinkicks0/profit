'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../components/Navigation';

type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisweek' | 'thismonth' | 'thisyear';

interface OrdersData {
  success: boolean;
  shop: string;
  dateRange: string;
  totalOrders: number;
  totalAmount: string;
  currency: string;
  storeBreakdown: Array<{
    store: string;
    orders: number;
    amount: string;
  }>;
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop');
  
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [selectedStore, setSelectedStore] = useState<string>('all');

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
      fetchOrders();
    }
  }, [shop, dateRange, selectedStore]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/orders/analytics?shop=${shop}&dateRange=${dateRange}&store=${selectedStore}`
      );
      const data = await response.json();
      
      if (data.success) {
        setOrdersData(data);
      } else {
        setError(data.error || 'Failed to fetch orders');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Orders Analytics</h1>
          <p className="text-sm text-gray-600">Store: {shop}</p>
        </div>
      </div>

      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Store Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Stores</option>
                {ordersData?.storeBreakdown.map((store) => (
                  <option key={store.store} value={store.store}>
                    {store.store}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={fetchOrders}
            className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading orders data...</p>
          </div>
        ) : ordersData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 text-white">
                <h3 className="text-lg font-semibold mb-2">Total Orders</h3>
                <p className="text-5xl font-bold">{ordersData.totalOrders}</p>
                <p className="text-blue-100 mt-3 capitalize">
                  {dateRangeOptions.find(opt => opt.value === dateRange)?.label}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-8 text-white">
                <h3 className="text-lg font-semibold mb-2">Total Amount</h3>
                <p className="text-4xl font-bold">
                  {ordersData.currency} {ordersData.totalAmount}
                </p>
                <p className="text-green-100 mt-3">Total revenue</p>
              </div>
            </div>

            {/* Store Breakdown */}
            {ordersData.storeBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Store Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ordersData.storeBreakdown.map((store) => (
                    <div
                      key={store.store}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-semibold text-gray-800 mb-2">{store.store}</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Orders:</span>{' '}
                          <span className="text-blue-600 font-bold">{store.orders}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Amount:</span>{' '}
                          <span className="text-green-600 font-bold">
                            {ordersData.currency} {store.amount}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}

