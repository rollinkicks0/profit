'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';
  const [showAuthButton, setShowAuthButton] = useState(false);

  const handleAuth = () => {
    if (shop) {
      window.location.href = `/api/auth?shop=${shop}`;
    } else {
      alert('❌ Shop parameter missing. Please access the app from Shopify.');
    }
  };

  // Check if we should show auth button (you can enhance this with actual auth check)
  useEffect(() => {
    // For now, always show the auth button for quick access
    setShowAuthButton(true);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* App Title */}
          <div>
            <h1 className="text-xl font-bold text-gray-900">Profit Tracker</h1>
            {shop && (
              <p className="text-xs text-gray-500">Store: {shop}</p>
            )}
          </div>

          {/* Auth Status & Button */}
          <div className="flex items-center space-x-4">
            {/* Auth Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600">Shopify Connected</span>
              </div>
            </div>

            {/* Re-authenticate Button */}
            {showAuthButton && (
              <button
                onClick={handleAuth}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
                title="Re-authenticate with Shopify if token expired"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                <span>Re-authenticate</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

