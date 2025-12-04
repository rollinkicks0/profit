import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const dateRange = searchParams.get('dateRange') || 'thismonth';

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

    // Fetch purchase orders
    const purchaseOrders = await fetchPurchaseOrders(
      shop,
      session.accessToken,
      startDate.toISOString(),
      endDate.toISOString()
    );

    // Calculate totals
    const totalPurchaseOrders = purchaseOrders.length;
    const totalAmount = purchaseOrders.reduce((sum: number, po: any) => {
      // Purchase orders might have total_price or need to calculate from line_items
      const poTotal = po.total_price || 
                      (po.line_items?.reduce((lineSum: number, item: any) => 
                        lineSum + (parseFloat(item.price || 0) * (item.quantity || 0)), 0) || 0);
      return sum + parseFloat(poTotal);
    }, 0);
    
    const currency = purchaseOrders[0]?.currency || 'NPR';

    return NextResponse.json({
      success: true,
      shop,
      dateRange,
      totalPurchaseOrders,
      totalAmount: totalAmount.toFixed(2),
      currency,
    });
  } catch (error: any) {
    console.error('Error fetching purchase orders analytics:', error);
    console.error('Error details:', error.response?.data);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch purchase orders',
        details: error.response?.data?.errors || error.message 
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

async function fetchPurchaseOrders(
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
      `https://${shop}/admin/api/2024-10/purchase_orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
        params,
      }
    );
    
    return response.data.purchase_orders || [];
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error.response?.data);
    throw error;
  }
}

