'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface OrderData {
  success: boolean;
  shop: string;
  date: string;
  totalOrders: number;
  orders: Array<{
    id: number;
    name: string;
    total: string;
    currency: string;
    created_at: string;
  }>;
}

function Dashboard() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop');
  
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      fetchOrders();
    }
  }, [shop]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/orders/today?shop=${shop}`);
      const data = await response.json();
      
      if (data.success) {
        setOrderData(data);
      } else {
        setError(data.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to handle OAuth redirect (breaks out of iframe if embedded)
  const handleOAuthRedirect = (shopDomain: string) => {
    const authUrl = `/api/auth?shop=${shopDomain}`;
    
    // Check if we're in an iframe (embedded in Shopify admin)
    if (window.top !== window.self) {
      // Break out of iframe for OAuth
      window.top!.location.href = authUrl;
    } else {
      // Normal redirect
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Profit Tracker Dashboard
          </h1>
          <p className="text-gray-600">Store: <span className="font-semibold">{shop}</span></p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        )}

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

        {orderData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Today's Orders</h3>
                <p className="text-4xl font-bold">{orderData.totalOrders}</p>
                <p className="text-blue-100 mt-2">{orderData.date}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
                <p className="text-4xl font-bold">
                  {orderData.orders.length > 0 
                    ? orderData.orders[0].currency 
                    : '$'} 
                  {orderData.orders.reduce((sum, order) => sum + parseFloat(order.total), 0).toFixed(2)}
                </p>
                <p className="text-green-100 mt-2">Today's total</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Profit</h3>
                <p className="text-4xl font-bold">Coming Soon</p>
                <p className="text-purple-100 mt-2">Stage 2 feature</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Today's Orders</h2>
                <button
                  onClick={fetchOrders}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
              
              {orderData.orders.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No orders today yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Order</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orderData.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800">{order.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-semibold">
                            {order.currency} {order.total}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
      <Dashboard />
    </Suspense>
  );
}

