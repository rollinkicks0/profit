'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Header() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const shop = searchParams?.get('shop') || '';
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Store shop and current page in localStorage
  useEffect(() => {
    if (shop) {
      localStorage.setItem('shopify_shop', shop);
      localStorage.setItem('last_page', pathname);
    }
  }, [shop, pathname]);

  const handleReAuthenticate = () => {
    if (!shop) {
      alert('Please provide shop parameter in URL');
      return;
    }
    
    setIsAuthenticating(true);
    
    // Store current page to redirect back after auth (in localStorage)
    const currentPage = pathname + (shop ? `?shop=${shop}` : '');
    localStorage.setItem('redirect_after_auth', currentPage);
    
    const authUrl = `/api/auth?shop=${shop}`;
    
    // Break out of iframe if needed
    if (window.top !== window.self) {
      window.top!.location.href = authUrl;
    } else {
      window.location.href = authUrl;
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Orders Analytics', path: '/orders' },
    { name: 'Orders List', path: '/orders/list' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Profit', path: '/profit' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Test Products', path: '/products/test' },
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      {/* Top Header Bar */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image 
                src="/profit_logo.PNG" 
                alt="Profit Tracker Logo" 
                width={40} 
                height={40}
                className="rounded"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Profit Tracker</h1>
                {shop && (
                  <p className="text-sm text-gray-600">Store: {shop}</p>
                )}
              </div>
            </div>
            
            {shop && (
              <button
                onClick={handleReAuthenticate}
                disabled={isAuthenticating}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isAuthenticating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Re-authenticate</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const href = shop ? `${item.path}?shop=${shop}` : item.path;
            const isActive = pathname === item.path;
            
            return (
              <Link
                key={item.path}
                href={href}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

