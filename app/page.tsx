'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from './components/Navigation';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: string;
  currency: string;
  weekOrders: number;
  monthOrders: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop');
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      fetchStats();
    }
  }, [shop]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/orders/stats?shop=${shop}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
      } else {
        setError(data.error || 'Failed to fetch statistics');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRedirect = (shopDomain: string) => {
    const authUrl = `/api/auth?shop=${shopDomain}`;
    
    if (window.top !== window.self) {
      window.top!.location.href = authUrl;
    } else {
      window.location.href = authUrl;
    }
  };

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Profit Tracker</h1>
          <p className="text-gray-600 mb-4">Enter your shop domain to get started:</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const shopDomain = formData.get('shop') as string;
            handleOAuthRedirect(shopDomain);
          }}>
            <input
              type="text"
              name="shop"
              placeholder="your-store.myshopify.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Connect to Shopify
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Profit Tracker</h1>
          <p className="text-sm text-gray-600">Store: {shop}</p>
        </div>
      </div>

      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
            {error.includes('Not authenticated') && (
              <button
                onClick={() => handleOAuthRedirect(shop!)}
                className="mt-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Authenticate Now
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Today's Orders</h3>
                <p className="text-4xl font-bold">{stats?.todayOrders || 0}</p>
                <p className="text-blue-100 mt-2">{new Date().toLocaleDateString()}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Today's Revenue</h3>
                <p className="text-3xl font-bold">{stats?.currency || 'NPR'} {stats?.todayRevenue || '0.00'}</p>
                <p className="text-green-100 mt-2">Today's total</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Profit</h3>
                <p className="text-3xl font-bold">Coming Soon</p>
                <p className="text-purple-100 mt-2">Stage 2 feature</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">This Week</h3>
                <p className="text-4xl font-bold text-blue-600">{stats?.weekOrders || 0}</p>
                <p className="text-gray-600 mt-2">Orders this week</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">This Month</h3>
                <p className="text-4xl font-bold text-green-600">{stats?.monthOrders || 0}</p>
                <p className="text-gray-600 mt-2">Orders this month</p>
              </div>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Navigation</h3>
              <p className="text-blue-700 mb-4">Use the navigation above to:</p>
              <ul className="list-disc list-inside text-blue-800 space-y-2">
                <li><strong>Orders:</strong> View detailed order analytics with date ranges and filters</li>
                <li><strong>Expenses:</strong> Track your business expenses (coming soon)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
