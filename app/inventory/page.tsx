'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';

function StoreValueContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';
  const [loading, setLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (shop) {
      fetchInventoryValue();
    }
  }, [shop]);

  const fetchInventoryValue = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/value?shop=${shop}`);
      const data = await response.json();
      
      if (data.success) {
        setInventoryData(data);
      } else {
        alert('Failed to fetch inventory: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Error fetching inventory data');
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Please provide shop parameter in URL</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Value (On Hand)</h1>
          <p className="text-gray-600">Total value of available inventory across all locations</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Calculating inventory value...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a minute for large inventories</p>
          </div>
        ) : inventoryData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Total Inventory Value</p>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">{inventoryData.currency} {inventoryData.totalValue}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Total Units</p>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">{inventoryData.totalUnits.toLocaleString()}</p>
                <p className="text-xs opacity-75 mt-1">items in stock</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Products in Stock</p>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">{inventoryData.totalProducts}</p>
                <p className="text-xs opacity-75 mt-1">variants with stock</p>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Inventory Breakdown</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Locations</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryData.products.map((product: any) => {
                      const isExpanded = expandedProducts.has(product.variantId.toString());
                      
                      return (
                        <>
                          <tr key={product.variantId} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleProduct(product.variantId.toString())}>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                {product.productImage && (
                                  <img src={product.productImage} alt={product.productTitle} className="w-10 h-10 rounded object-cover mr-3" />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.productTitle}</div>
                                  {product.variantTitle !== 'Default Title' && (
                                    <div className="text-xs text-gray-500">{product.variantTitle}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{product.sku || '-'}</td>
                            <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                              {inventoryData.currency} {product.price}
                            </td>
                            <td className="px-6 py-4 text-sm text-right">
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {product.stock} units
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                              {inventoryData.currency} {product.value}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                className="text-gray-400 hover:text-gray-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProduct(product.variantId.toString());
                                }}
                              >
                                <svg
                                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                          
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                <div className="text-sm">
                                  <p className="font-semibold text-gray-700 mb-2">Stock by Location:</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {product.locationBreakdown.map((loc: any) => (
                                      <div key={loc.locationId} className="bg-white rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-500">{loc.locationName}</p>
                                        <p className="text-lg font-bold text-gray-900">{loc.quantity}</p>
                                      </div>
                                    ))}
                                  </div>
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
            </div>

            {/* Refresh Button */}
            <div className="mt-6 text-center">
              <button
                onClick={fetchInventoryValue}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh Inventory'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StoreValuePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StoreValueContent />
    </Suspense>
  );
}

