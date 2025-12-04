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

    // Fetch locations
    const locationsResponse = await axios.get(
      `https://${shop}/admin/api/2024-10/locations.json`,
      {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
      }
    );

    const locations = locationsResponse.data.locations || [];
    const activeLocations = locations.filter((loc: any) => loc.active);

    // Group orders by location
    const locationBreakdown: any = {};
    
    // Initialize all active locations with zero counts
    activeLocations.forEach((loc: any) => {
      locationBreakdown[loc.id] = {
        locationId: loc.id,
        locationName: loc.name,
        address: `${loc.city || ''}, ${loc.province || ''}`.trim(),
        orders: 0,
        amount: 0,
      };
    });

    // Count orders by location
    orders.forEach((order: any) => {
      // Check line items for fulfillment location
      if (order.line_items && order.line_items.length > 0) {
        order.line_items.forEach((item: any) => {
          const locationId = item.fulfillment_service === 'manual' 
            ? order.location_id 
            : item.location_id || order.location_id;
          
          if (locationId && locationBreakdown[locationId]) {
            // Add order only once per order (not per line item)
            if (!locationBreakdown[locationId].orderIds) {
              locationBreakdown[locationId].orderIds = new Set();
            }
            
            if (!locationBreakdown[locationId].orderIds.has(order.id)) {
              locationBreakdown[locationId].orderIds.add(order.id);
              locationBreakdown[locationId].orders += 1;
              locationBreakdown[locationId].amount += parseFloat(order.total_price || 0);
            }
          }
        });
      } else if (order.location_id && locationBreakdown[order.location_id]) {
        locationBreakdown[order.location_id].orders += 1;
        locationBreakdown[order.location_id].amount += parseFloat(order.total_price || 0);
      }
    });

    // Convert to array and format amounts
    const locationData = Object.values(locationBreakdown).map((loc: any) => {
      delete loc.orderIds; // Remove the Set object
      return {
        ...loc,
        amount: loc.amount.toFixed(2),
      };
    });

    // Calculate totals
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );
    const currency = orders[0]?.currency || 'NPR';

    return NextResponse.json({
      success: true,
      shop,
      dateRange,
      totalOrders,
      totalAmount: totalAmount.toFixed(2),
      currency,
      locationBreakdown: locationData,
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

