'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header';

interface LineItem {
  productName: string;
  variantTitle: string;
  quantity: number;
  price: number;
  unitCost: number;
  totalCost: number;
  variantId: number;
  sku: string;
}

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
  locationName: string;
  lineItems: LineItem[];
}

function OrdersListContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [currency, setCurrency] = useState('NPR');
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [loadingCosts, setLoadingCosts] = useState<Set<string>>(new Set());
  const [variantCosts, setVariantCosts] = useState<{[key: string]: number}>({});

  const fetchVariantCost = async (variantId: number) => {
    const key = variantId.toString();
    
    // Skip if already fetched or loading
    if (variantCosts[key] !== undefined || loadingCosts.has(key)) {
      return;
    }

    // Mark as loading
    setLoadingCosts(prev => new Set(prev).add(key));

    try {
      const response = await fetch(
        `/api/orders/variant-cost?shop=${shop}&variantId=${variantId}`
      );
      const data = await response.json();

      console.log(`📦 [RESPONSE] Variant ${variantId}:`, data);

      if (data.success !== false) {
        setVariantCosts(prev => ({
          ...prev,
          [key]: data.cost,
        }));
        console.log(`✅ [CLIENT] Variant ${variantId}: Cost = ${data.cost}`);
      } else {
        console.error(`❌ [CLIENT] Variant ${variantId} failed:`, data.error, data.details);
        setVariantCosts(prev => ({
          ...prev,
          [key]: 0,
        }));
      }
    } catch (error) {
      console.error(`❌ [CLIENT ERROR] Variant ${variantId}:`, error);
      setVariantCosts(prev => ({
        ...prev,
        [key]: 0,
      }));
    } finally {
      // Remove from loading
      setLoadingCosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const toggleOrderExpand = async (orderId: number, order: Order) => {
    const newExpanded = new Set(expandedOrders);
    const isExpanding = !newExpanded.has(orderId);
    
    if (isExpanding) {
      newExpanded.add(orderId);
      
      // Fetch costs for all variants in this order
      console.log('📦 Fetching costs for order:', order.orderNumber);
      const variantIds = order.lineItems.map(item => item.variantId).filter(Boolean);
      
      // Fetch all costs in parallel
      await Promise.all(
        variantIds.map(variantId => fetchVariantCost(variantId))
      );
    } else {
      newExpanded.delete(orderId);
    }
    
    setExpandedOrders(newExpanded);
  };

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

  const getLocationBadge = (locationName: string) => {
    const colors: any = {
      'Birthmode': 'bg-blue-100 text-blue-800',
      'Damak': 'bg-green-100 text-green-800',
      'Dharan': 'bg-purple-100 text-purple-800',
    };
    
    const color = colors[locationName] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        {locationName}
      </span>
    );
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
      <Header />

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
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
                    const isExpanded = expandedOrders.has(order.id);
                    
                    return (
                      <>
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleOrderExpand(order.id, order)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <svg
                                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </td>
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
                          {getLocationBadge(order.locationName)}
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
                      
                      {/* Expanded Row - Line Items */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-gray-50">
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h4 className="font-semibold text-gray-800 mb-3">Order Items:</h4>
                              <table className="w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Product & Variant</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Quantity</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Selling Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Cost Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Item Profit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {order.lineItems.map((item, idx) => {
                                    const variantKey = item.variantId?.toString();
                                    const fetchedCost = variantKey ? (variantCosts[variantKey] ?? null) : null;
                                    const isLoadingCost = variantKey ? loadingCosts.has(variantKey) : false;
                                    
                                    // Use fetched cost if available, otherwise fall back to order data
                                    const actualCost = fetchedCost !== null ? fetchedCost : item.unitCost;
                                    const itemProfit = (item.price - actualCost) * item.quantity;
                                    
                                    return (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm">
                                          <div>
                                            <p className="font-medium text-gray-800">{item.productName}</p>
                                            {item.variantTitle && item.variantTitle !== 'Default Title' && (
                                              <p className="text-xs text-gray-500">Variant: {item.variantTitle}</p>
                                            )}
                                            <p className="text-xs text-gray-400">
                                              SKU: {item.sku || 'N/A'} | Variant ID: {item.variantId}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-center text-sm font-semibold text-gray-700">
                                          {item.quantity}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm">
                                          <span className="font-semibold text-gray-700">
                                            {currency} {item.price.toFixed(2)}
                                          </span>
                                          <br />
                                          <span className="text-xs text-gray-500">
                                            × {item.quantity} = {currency} {(item.price * item.quantity).toFixed(2)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm">
                                          {isLoadingCost ? (
                                            <div className="flex items-center justify-end space-x-2">
                                              <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              <span className="text-xs text-gray-500">Loading...</span>
                                            </div>
                                          ) : actualCost > 0 ? (
                                            <>
                                              <span className="font-semibold text-red-600">
                                                {currency} {actualCost.toFixed(2)}
                                              </span>
                                              <br />
                                              <span className="text-xs text-gray-500">
                                                × {item.quantity} = {currency} {(actualCost * item.quantity).toFixed(2)}
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-xs text-red-600 font-semibold">NOT SET</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm">
                                          {isLoadingCost ? (
                                            <span className="text-xs text-gray-500">...</span>
                                          ) : (
                                            <span className={`font-bold ${itemProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {currency} {itemProfit.toFixed(2)}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-gray-100 font-bold">
                                  <tr>
                                    <td className="px-4 py-2 text-sm text-gray-800" colSpan={2}>
                                      TOTALS:
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-green-600">
                                      {currency} {order.totalPrice.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-red-600">
                                      {currency} {
                                        order.lineItems.reduce((sum, item) => {
                                          const variantKey = item.variantId?.toString();
                                          const fetchedCost = variantKey ? (variantCosts[variantKey] ?? null) : null;
                                          const actualCost = fetchedCost !== null ? fetchedCost : item.unitCost;
                                          return sum + (actualCost * item.quantity);
                                        }, 0).toFixed(2)
                                      }
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-emerald-600">
                                      {currency} {
                                        (order.totalPrice - order.lineItems.reduce((sum, item) => {
                                          const variantKey = item.variantId?.toString();
                                          const fetchedCost = variantKey ? (variantCosts[variantKey] ?? null) : null;
                                          const actualCost = fetchedCost !== null ? fetchedCost : item.unitCost;
                                          return sum + (actualCost * item.quantity);
                                        }, 0)).toFixed(2)
                                      }
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

