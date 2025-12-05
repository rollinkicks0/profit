'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../components/Navigation';

interface Variant {
  id: number;
  shopify_variant_id: number;
  title: string;
  sku: string | null;
  price: number;
  cost: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  last_synced_at: string;
}

interface Product {
  id: number;
  shopify_product_id: number;
  title: string;
  status: string;
  product_type: string | null;
  vendor: string | null;
  image_url: string | null;
  variant_count: number;
  avg_selling_price: number;
  avg_cost_price: number;
  avg_profit_per_unit: number;
  last_synced_at: string;
  variants?: Variant[];
}

function PricingPage() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingProduct, setSyncingProduct] = useState<Set<number>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [loadingVariants, setLoadingVariants] = useState<Set<number>>(new Set());
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pricing/list`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!shop) {
      alert('❌ Shop parameter is missing. Please authenticate first.');
      return;
    }

    setSyncingAll(true);
    setAuthError(false);
    
    try {
      const response = await fetch('/api/pricing/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop }),
      });

      const data = await response.json();
      
      if (response.status === 401) {
        setAuthError(true);
        alert('❌ Not authenticated with Shopify. Please authenticate first.');
        return;
      }
      
      if (data.success) {
        alert(`✅ Synced ${data.productsProcessed} products successfully!`);
        fetchProducts();
      } else {
        alert(`❌ Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Sync all failed:', error);
      alert('❌ Sync failed. Check console for details.');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncProduct = async (productId: number, shopifyProductId: number) => {
    setSyncingProduct(prev => new Set(prev).add(productId));
    
    try {
      const response = await fetch('/api/pricing/sync-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, productId: shopifyProductId }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Synced: ${data.product.title} (${data.variantsSynced} variants)`);
        fetchProducts();
        
        // Refresh variants if expanded
        if (expandedProducts.has(productId)) {
          await fetchProductVariants(productId);
        }
      } else {
        alert(`❌ Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`Sync product ${productId} failed:`, error);
      alert('❌ Sync failed. Check console for details.');
    } finally {
      setSyncingProduct(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const fetchProductVariants = async (productId: number) => {
    setLoadingVariants(prev => new Set(prev).add(productId));
    
    try {
      const response = await fetch(`/api/pricing/list?productId=${productId}`);
      const data = await response.json();
      
      if (data.success && data.product) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, variants: data.product.variants } : p
        ));
      }
    } catch (error) {
      console.error(`Failed to fetch variants for product ${productId}:`, error);
    } finally {
      setLoadingVariants(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const toggleProductExpand = async (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    const isExpanding = !newExpanded.has(productId);
    
    if (isExpanding) {
      newExpanded.add(productId);
      await fetchProductVariants(productId);
    } else {
      newExpanded.delete(productId);
    }
    
    setExpandedProducts(newExpanded);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-600 mt-2">
            Store: {shop || 'Not specified'}
          </p>
        </div>

        <Navigation />

        {/* Authentication Error Alert */}
        {authError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Authentication Required</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>You need to authenticate with Shopify first before using the Pricing page.</p>
                  <a 
                    href={`/api/auth?shop=${shop}`}
                    className="font-medium underline hover:text-red-600 mt-2 inline-block"
                  >
                    Click here to authenticate with Shopify
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sync Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Product Sync</h2>
              <p className="text-sm text-gray-600 mt-1">
                Sync products from Shopify to local database for faster access
              </p>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center space-x-2"
            >
              {syncingAll ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sync All Products</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 mb-4">No products found. Click "Sync All Products" to fetch from Shopify.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variants</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Selling Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Synced</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => {
                    const isExpanded = expandedProducts.has(product.id);
                    const isSyncing = syncingProduct.has(product.id);
                    const isLoadingVars = loadingVariants.has(product.id);

                    return (
                      <>
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleProductExpand(product.id)}
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
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {product.image_url && (
                                <img src={product.image_url} alt={product.title} className="w-12 h-12 object-cover rounded" />
                              )}
                              <div>
                                <p className="font-medium text-gray-800">{product.title}</p>
                                <p className="text-xs text-gray-500">{product.vendor || 'No vendor'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {product.variant_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                            NPR {product.avg_selling_price?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                            NPR {product.avg_cost_price?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-blue-600">
                            NPR {product.avg_profit_per_unit?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            {formatDate(product.last_synced_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleSyncProduct(product.id, product.shopify_product_id)}
                              disabled={isSyncing}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                            >
                              {isSyncing ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Syncing...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span>Sync Prices</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Row - Variants */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-6 py-4 bg-gray-50">
                              {isLoadingVars ? (
                                <div className="text-center py-8">
                                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <p className="text-gray-600 mt-2">Loading variants...</p>
                                </div>
                              ) : product.variants && product.variants.length > 0 ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <h4 className="font-semibold text-gray-800 mb-3">Variants:</h4>
                                  <table className="w-full">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Variant</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">SKU</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Selling Price</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Cost Price</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Profit per Unit</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {product.variants.map((variant) => {
                                        const profit = variant.price - variant.cost;
                                        return (
                                          <tr key={variant.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm text-gray-800">
                                              {variant.title}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                              {variant.sku || 'N/A'}
                                            </td>
                                            <td className="px-4 py-2 text-right text-sm font-semibold text-green-600">
                                              NPR {variant.price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-right text-sm font-semibold text-red-600">
                                              NPR {variant.cost.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-right text-sm font-bold text-blue-600">
                                              NPR {profit.toFixed(2)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-center text-gray-600 py-4">No variants found. Click "Sync Prices" to fetch data.</p>
                              )}
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
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
      <PricingPage />
    </Suspense>
  );
}

