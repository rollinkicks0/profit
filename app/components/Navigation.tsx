'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Orders', path: '/orders' },
    { name: 'Purchase Orders', path: '/purchase-orders' },
    { name: 'Expenses', path: '/expenses' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 mb-6">
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
    </nav>
  );
}

