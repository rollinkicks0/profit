'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';

interface Stats {
  shopify: {
    totalProducts: number;
    totalVariants: number;
    error: string | null;
  };
  supabase: {
    totalProducts: number;
    totalVariants: number;
    syncedProducts: number;
    syncedVariants: number;
    variantsNeedingSync: number;
    lastSyncTime: string | null;
  };
}

interface SyncStats {
  productsChecked: number;
  productsUpdated: number;
  variantsChecked: number;
  variantsUpdated: number;
  priceChanges: number;
  costChanges: number;
  newProductsFound: number;
  errors: number;
}

function PricingContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';

  const [stats, setStats] = useState<Stats | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      fetchStats();
    }
  }, [shop]);

  const fetchStats = async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const response = await fetch(`/api/pricing/stats?shop=${shop}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
      } else if (response.status === 401) {
        setError('Not authenticated with Shopify');
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSmartSync = async () => {
    if (!shop) {
      alert('❌ Shop parameter is missing. Please authenticate first.');
      return;
    }

    setSyncing(true);
    setError(null);
    setSyncStats(null);

    try {
      const response = await fetch('/api/pricing/smart-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setError('Not authenticated with Shopify');
        return;
      }

      if (data.success) {
        setSyncStats(data.stats);
        await fetchStats(); // Refresh stats
        alert(`✅ Sync completed!\n\nProducts Updated: ${data.stats.productsUpdated}\nVariants Updated: ${data.stats.variantsUpdated}\nPrice Changes: ${data.stats.priceChanges}\nCost Changes: ${data.stats.costChanges}`);
      } else {
        setError(data.error || 'Sync failed');
        alert(`❌ Sync failed: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      setError('Sync failed. Check console for details.');
      alert('❌ Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const handleOAuthRedirect = () => {
    window.location.href = `/api/auth?shop=${shop}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              {error.includes('authenticated') && (
                <button
                  onClick={handleOAuthRedirect}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Authenticate
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header with Sync Button */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
            <p className="text-gray-600 mt-2">Compare Shopify and Supabase data, sync prices and costs</p>
          </div>
          <button
            onClick={handleSmartSync}
            disabled={syncing || !shop}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-8 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 shadow-lg"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-semibold">Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-semibold">Smart Sync</span>
              </>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Shopify Stats */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200 shadow-md">
              <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center">
                <span className="text-3xl mr-3">🏪</span>
                Shopify Store (Source of Truth)
              </h3>
              {stats.shopify.error ? (
                <p className="text-red-600 text-sm font-semibold">{stats.shopify.error}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white/50 rounded">
                    <span className="text-gray-700 font-medium">Total Products:</span>
                    <span className="text-3xl font-bold text-green-700">{stats.shopify.totalProducts}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/50 rounded">
                    <span className="text-gray-700 font-medium">Total Variants:</span>
                    <span className="text-3xl font-bold text-green-700">{stats.shopify.totalVariants}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Supabase Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200 shadow-md">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                <span className="text-3xl mr-3">💾</span>
                Supabase Database
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/50 rounded">
                  <span className="text-gray-700 font-medium">Total Products:</span>
                  <span className="text-3xl font-bold text-blue-700">{stats.supabase.totalProducts}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/50 rounded">
                  <span className="text-gray-700 font-medium">Total Variants:</span>
                  <span className="text-3xl font-bold text-blue-700">{stats.supabase.totalVariants}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-blue-200">
                  <span className="text-gray-600 font-medium">Synced with Shopify:</span>
                  <span className="font-bold text-blue-600">{stats.supabase.syncedVariants} / {stats.supabase.totalVariants}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Sync Results */}
        {syncStats && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 mb-8 shadow-md">
            <h3 className="text-2xl font-bold text-green-900 mb-6 flex items-center">
              <span className="text-3xl mr-3">✅</span>
              Sync Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Products Checked</p>
                <p className="text-3xl font-bold text-gray-800">{syncStats.productsChecked}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Products Updated</p>
                <p className="text-3xl font-bold text-blue-600">{syncStats.productsUpdated}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Variants Checked</p>
                <p className="text-3xl font-bold text-gray-800">{syncStats.variantsChecked}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Variants Updated</p>
                <p className="text-3xl font-bold text-blue-600">{syncStats.variantsUpdated}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Price Changes</p>
                <p className="text-3xl font-bold text-green-600">{syncStats.priceChanges}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Cost Changes</p>
                <p className="text-3xl font-bold text-green-600">{syncStats.costChanges}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">New Products</p>
                <p className="text-3xl font-bold text-purple-600">{syncStats.newProductsFound}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Errors</p>
                <p className="text-3xl font-bold text-red-600">{syncStats.errors}</p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
          <h4 className="font-bold text-blue-900 mb-2">How Smart Sync Works:</h4>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li className="flex items-start">
              <span className="mr-2">🔍</span>
              <span>Compares all products and variants between Shopify (source of truth) and Supabase</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💰</span>
              <span>Detects price and cost changes by comparing exact values</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⚡</span>
              <span>Only updates what has changed - no unnecessary writes</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📊</span>
              <span>Shopify prices and costs always override Supabase data</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🆕</span>
              <span>New products found in Shopify are reported but not auto-imported (import via CSV first)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading pricing management...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}

