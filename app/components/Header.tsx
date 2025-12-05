'use client';

import { useSearchParams } from 'next/navigation';

export default function Header() {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';

  const handleReAuthenticate = () => {
    if (!shop) {
      alert('Please provide shop parameter in URL');
      return;
    }
    
    const authUrl = `/api/auth?shop=${shop}`;
    
    // Break out of iframe if needed
    if (window.top !== window.self) {
      window.top!.location.href = authUrl;
    } else {
      window.location.href = authUrl;
    }
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Profit Tracker</h1>
            {shop && (
              <p className="text-sm text-gray-600">Store: {shop}</p>
            )}
          </div>
          
          {shop && (
            <button
              onClick={handleReAuthenticate}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Re-authenticate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

