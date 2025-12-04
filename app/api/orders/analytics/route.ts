import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const dateRange = searchParams.get('dateRange') || 'today';
    const storeFilter = searchParams.get('store') || 'all';

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    const sessions = await sessionStorage.findSessionsByShop(shop);
    const session = sessions[0];

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please install the app first.' },
        { status: 401 }
      );
    }

    // Calculate date range
    const { startDate, endDate } = getDateRange(dateRange);

    // Fetch orders
    const orders = await fetchOrders(
      shop,
      session.accessToken,
      startDate.toISOString(),
      endDate.toISOString()
    );

    // Calculate totals
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );
    const currency = orders[0]?.currency || 'NPR';

    // Store breakdown (for future multi-store support)
    const storeBreakdown = [{
      store: shop,
      orders: totalOrders,
      amount: totalAmount.toFixed(2),
    }];

    return NextResponse.json({
      success: true,
      shop,
      dateRange,
      totalOrders,
      totalAmount: totalAmount.toFixed(2),
      currency,
      storeBreakdown: storeFilter === 'all' ? storeBreakdown : storeBreakdown.filter(s => s.store === storeFilter),
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch analytics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function getDateRange(range: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    
    case 'yesterday':
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'last7days':
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    
    case 'last30days':
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    
    case 'thisweek':
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    
    case 'thismonth':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    
    case 'thisyear':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    
    default:
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

async function fetchOrders(
  shop: string,
  accessToken: string,
  since: string,
  until?: string
) {
  try {
    const params: any = {
      status: 'any',
      created_at_min: since,
      limit: 250,
    };

    if (until) {
      params.created_at_max = until;
    }

    const response = await axios.get(
      `https://${shop}/admin/api/2024-10/orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
        params,
      }
    );
    
    return response.data.orders || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

