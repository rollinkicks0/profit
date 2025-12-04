import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

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

    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    // Fetch orders
    const [todayOrders, weekOrders, monthOrders] = await Promise.all([
      fetchOrders(shop, session.accessToken, today),
      fetchOrders(shop, session.accessToken, weekAgo.toISOString()),
      fetchOrders(shop, session.accessToken, monthAgo.toISOString()),
    ]);

    const todayRevenue = todayOrders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );

    return NextResponse.json({
      success: true,
      todayOrders: todayOrders.length,
      todayRevenue: todayRevenue.toFixed(2),
      currency: todayOrders[0]?.currency || 'NPR',
      weekOrders: weekOrders.length,
      monthOrders: monthOrders.length,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch statistics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

async function fetchOrders(shop: string, accessToken: string, since: string) {
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/2024-10/orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
        params: {
          status: 'any',
          created_at_min: since,
          limit: 250,
        },
      }
    );
    return response.data.orders || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

