import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const dateRange = searchParams.get('dateRange') || 'today';

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
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Calculate date range
    const { startDate, endDate } = getDateRange(dateRange);

    // Fetch orders for the date range
    const orders = await fetchOrders(
      shop,
      session.accessToken,
      startDate.toISOString(),
      endDate.toISOString()
    );

    // Calculate basics from orders
    const totalRevenue = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );

    // Simple COGS calculation using Supabase
    const variantIds = new Set<string>();
    orders.forEach((order: any) => {
      order.line_items?.forEach((item: any) => {
        if (item.variant_id) {
          variantIds.add(item.variant_id.toString());
        }
      });
    });

    // Fetch variant costs from Supabase
    let totalCost = 0;
    if (variantIds.size > 0) {
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('shopify_variant_id, cost')
        .in('shopify_variant_id', Array.from(variantIds));

      const variantCosts: { [key: string]: number } = {};
      variantsData?.forEach((v: any) => {
        if (v.shopify_variant_id) {
          variantCosts[v.shopify_variant_id.toString()] = parseFloat(v.cost || 0);
        }
      });

      // Calculate total COGS
      orders.forEach((order: any) => {
        order.line_items?.forEach((item: any) => {
          const variantId = item.variant_id?.toString();
          const quantity = item.quantity || 0;
          const cost = variantCosts[variantId] || 0;
          totalCost += cost * quantity;
        });
      });
    }

    // Fetch expenses for date range
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop', shop)
      .gte('expense_date', startDate.toISOString().split('T')[0])
      .lte('expense_date', endDate.toISOString().split('T')[0]);

    const totalExpenses = (expenses || []).reduce(
      (sum: number, expense: any) => sum + parseFloat(expense.amount || 0),
      0
    );

    // Calculate profits
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;

    return NextResponse.json({
      success: true,
      dateRange,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      currency: orders[0]?.currency || 'NPR',
      ordersCount: orders.length,
      revenue: totalRevenue.toFixed(2),
      costOfGoods: totalCost.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      expenses: totalExpenses.toFixed(2),
      netProfit: netProfit.toFixed(2),
      expensesCount: expenses?.length || 0,
    });
  } catch (error: any) {
    console.error('Error calculating profit:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to calculate profit',
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

