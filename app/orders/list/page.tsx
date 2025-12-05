'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../../components/Navigation';

interface Order {
  id: number;
  orderNumber: string;
  createdAt: string;
  totalPrice: number;
  totalCost: number;
  currency: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  itemCount: number;
  locationId: number;
}

function OrdersListContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [currency, setCurrency] = useState('NPR');

  useEffect(() => {
    if (shop) {
      fetchLocations();
      fetchOrders();
    }
  }, [shop, selectedLocation]);

  const fetchLocations = async () => {
    try {
      const response = await fetch(`/api/locations?shop=${shop}`);
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/orders/list?shop=${shop}&location=${selectedLocation}`
      );
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, type: 'payment' | 'fulfillment') => {
    const styles: any = {
      payment: {
        paid: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        refunded: 'bg-red-100 text-red-800',
        partially_refunded: 'bg-orange-100 text-orange-800',
      },
      fulfillment: {
        fulfilled: 'bg-blue-100 text-blue-800',
        unfulfilled: 'bg-gray-100 text-gray-800',
        partial: 'bg-purple-100 text-purple-800',
        null: 'bg-gray-100 text-gray-800',
      },
    };

    const style = styles[type][status || 'null'] || 'bg-gray-100 text-gray-800';
    const label = status || (type === 'fulfillment' ? 'Unfulfilled' : 'Pending');

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style}`}>
        {label.replace('_', ' ').toUpperCase()}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-800">Orders List</h1>
          <p className="text-sm text-gray-600">Store: {shop}</p>
        </div>
      </div>

      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="ml-4 mt-6">
              <button
                onClick={fetchOrders}
                className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">
              Orders ({orders.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No orders found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fulfillment
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const profit = order.totalPrice - order.totalCost;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {order.orderNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString()}
                          <br />
                          <span className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.paymentStatus, 'payment')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.fulfillmentStatus, 'fulfillment')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {order.itemCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-green-600">
                            {currency} {order.totalPrice.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-red-600">
                            {currency} {order.totalCost.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-bold ${
                            profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {currency} {profit.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {orders.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-4 text-white">
              <p className="text-sm opacity-90">Total Orders</p>
              <p className="text-3xl font-bold">{orders.length}</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-4 text-white">
              <p className="text-sm opacity-90">Total Revenue</p>
              <p className="text-2xl font-bold">
                {currency} {orders.reduce((sum, o) => sum + o.totalPrice, 0).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md p-4 text-white">
              <p className="text-sm opacity-90">Total Cost</p>
              <p className="text-2xl font-bold">
                {currency} {orders.reduce((sum, o) => sum + o.totalCost, 0).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md p-4 text-white">
              <p className="text-sm opacity-90">Total Profit</p>
              <p className="text-2xl font-bold">
                {currency} {orders.reduce((sum, o) => sum + (o.totalPrice - o.totalCost), 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OrdersListContent />
    </Suspense>
  );
}

