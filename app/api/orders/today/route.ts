import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import { getOrdersToday } from '@/lib/shopify-client';

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

    // Get session for shop
    const sessions = await sessionStorage.findSessionsByShop(shop);
    const session = sessions[0];

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please install the app first.' },
        { status: 401 }
      );
    }

    // Fetch today's orders
    const ordersData = await getOrdersToday(shop, session.accessToken);

    return NextResponse.json({
      success: true,
      shop: shop,
      date: new Date().toLocaleDateString(),
      totalOrders: ordersData.count,
      orders: ordersData.orders.map((order: any) => ({
        id: order.id,
        name: order.name,
        total: order.total_price,
        currency: order.currency,
        created_at: order.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch orders',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

