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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status and store current page
  useEffect(() => {
    if (shop) {
      localStorage.setItem('shopify_shop', shop);
      localStorage.setItem('last_page', pathname);
      
      // Check if authenticated
      const checkAuth = async () => {
        try {
          const response = await fetch(`/api/auth/check?shop=${shop}`);
          const data = await response.json();
          setIsAuthenticated(data.authenticated);
        } catch (error) {
          console.error('Error checking auth:', error);
          setIsAuthenticated(false);
        } finally {
          setCheckingAuth(false);
        }
      };
      
      checkAuth();
    } else {
      setCheckingAuth(false);
    }
  }, [shop, pathname]);

  const handleReAuthenticate = () => {
    if (!shop) {
      console.error('❌ No shop parameter provided');
      alert('Please provide shop parameter in URL');
      return;
    }
    
    console.log('🔐 Starting authentication for shop:', shop);
    setIsAuthenticating(true);
    
    // Store current page to redirect back after auth (in localStorage)
    const currentPage = pathname + (shop ? `?shop=${shop}` : '');
    localStorage.setItem('redirect_after_auth', currentPage);
    console.log('💾 Stored redirect page:', currentPage);
    
    const authUrl = `/api/auth?shop=${shop}`;
    console.log('🔐 Redirecting to auth URL:', authUrl);
    
    // Break out of iframe if needed
    if (window.top !== window.self) {
      console.log('🪟 In iframe, redirecting parent window');
      window.top!.location.href = authUrl;
    } else {
      console.log('🪟 In main window, redirecting');
      window.location.href = authUrl;
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Orders Analytics', path: '/orders' },
    { name: 'Orders List', path: '/orders/list' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Store Value', path: '/inventory' },
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
            
            {shop && !checkingAuth && (
              <>
                {/* Show auth status */}
                {isAuthenticated ? (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Connected</span>
                  </div>
                ) : (
                  <button
                    onClick={handleReAuthenticate}
                    disabled={isAuthenticating}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Authenticate</span>
                      </>
                    )}
                  </button>
                )}
              </>
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

