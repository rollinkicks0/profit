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
  locationBreakdown: Array<{
    locationId: number;
    locationName: string;
    address: string;
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
  }, [shop, dateRange]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/orders/analytics?shop=${shop}&dateRange=${dateRange}`
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
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
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
            
            <button
              onClick={fetchOrders}
              className="ml-4 mt-6 bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh
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

            {/* Location Breakdown - Dynamic based on active locations */}
            {ordersData.locationBreakdown && ordersData.locationBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location Breakdown
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ordersData.locationBreakdown.map((location) => (
                    <div
                      key={location.locationId}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">{location.locationName}</h4>
                          <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                        </div>
                        <div className="bg-blue-100 rounded-full p-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Orders</p>
                          <p className="text-2xl font-bold text-blue-600">{location.orders}</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Revenue</p>
                          <p className="text-xl font-bold text-green-600">
                            {ordersData.currency} {location.amount}
                          </p>
                        </div>
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

