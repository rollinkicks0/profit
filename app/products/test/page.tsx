'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../../components/Navigation';
import Header from '../../components/Header';

interface Product {
  id: number;
  title: string;
  image: string | null;
}

interface ProductDetail {
  id: number;
  title: string;
  image: string | null;
  variants: Array<{
    variantId: number;
    variantTitle: string;
    sku: string;
    price: number;
    cost: number;
    inventoryItemId: number;
    totalAvailable: number;
    locationInventory: Array<{
      locationId: number;
      locationName: string;
      available: number;
    }>;
    error?: string;
  }>;
}

function ProductTestContent() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const url = `/api/products/test?shop=${shop}&query=${encodeURIComponent(searchQuery)}`;
      console.log('Fetching:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Search response:', data);
      
      if (data.success) {
        setSearchResults(data.products);
        setSelectedProduct(null);
        
        if (data.products.length === 0) {
          alert('No products found. Try a different search term.');
        }
      } else {
        alert(`Error: ${data.error || 'Failed to search'}`);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      alert('Failed to search products. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = async (productId: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/products/test?shop=${shop}&productId=${productId}`
      );
      const data = await response.json();
      
      if (data.success) {
        setSelectedProduct(data.product);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
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
      <Header />
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 relative z-10">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Product
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter product name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 relative z-10">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Search Results ({searchResults.length} found)
            </h2>
            <div className="space-y-2">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product.id)}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800">{product.title}</h3>
                    <p className="text-sm text-gray-500">ID: {product.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Details */}
        {selectedProduct && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start gap-6 mb-6 pb-6 border-b">
              {selectedProduct.image && (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.title}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedProduct.title}</h2>
                <p className="text-gray-600">Product ID: {selectedProduct.id}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedProduct.variants.length} variant(s)
                </p>
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-6">
              {selectedProduct.variants.map((variant) => (
                <div key={variant.variantId} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{variant.variantTitle}</h3>
                      {variant.sku && (
                        <p className="text-sm text-gray-500">SKU: {variant.sku}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Variant ID: {variant.variantId} | Inventory Item ID: {variant.inventoryItemId}
                      </p>
                    </div>
                  </div>

                  {variant.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-red-800 text-sm">{variant.error}</p>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-1">Selling Price</p>
                      <p className="text-2xl font-bold text-green-600">NPR {variant.price.toFixed(2)}</p>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-1">Cost Price</p>
                      <p className="text-2xl font-bold text-red-600">
                        {variant.cost > 0 ? `NPR ${variant.cost.toFixed(2)}` : 'NOT SET'}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-1">Profit per Unit</p>
                      <p className={`text-2xl font-bold ${
                        variant.price - variant.cost >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        NPR {(variant.price - variant.cost).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Total Availability */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Total Available (All Locations)</p>
                    <p className="text-3xl font-bold text-purple-600">{variant.totalAvailable} units</p>
                  </div>

                  {/* Location Inventory */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Inventory by Location</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {variant.locationInventory.map((loc) => (
                        <div
                          key={loc.locationId}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                        >
                          <p className="text-sm font-semibold text-gray-800">{loc.locationName}</p>
                          <p className="text-lg font-bold text-gray-700">{loc.available} units</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">💡 How to Set Cost Price:</h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Go to Shopify Admin → Products</li>
                <li>Click on the product</li>
                <li>In the Variants section, click on a variant</li>
                <li>Scroll to "Inventory" section</li>
                <li>Set the <strong>"Cost per item"</strong> field</li>
                <li>Click Save</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ProductTestContent />
    </Suspense>
  );
}

