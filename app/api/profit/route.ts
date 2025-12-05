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

    // Calculate Revenue (Total Selling Price)
    const totalRevenue = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );

    // Calculate Cost of Goods Sold (COGS)
    let totalCost = 0;
    const productVariantIds = new Set<string>();
    
    // Collect all variant IDs from orders
    orders.forEach((order: any) => {
      order.line_items?.forEach((item: any) => {
        if (item.variant_id) {
          productVariantIds.add(item.variant_id.toString());
        }
      });
    });

    // Fetch product variants to get cost
    const variantCosts: { [key: string]: number } = {};
    
    if (productVariantIds.size > 0) {
      try {
        // Fetch inventory items for variants
        for (const variantId of Array.from(productVariantIds)) {
          const variantResponse = await axios.get(
            `https://${shop}/admin/api/2024-10/variants/${variantId}.json`,
            {
              headers: {
                'X-Shopify-Access-Token': session.accessToken,
              },
            }
          );

          const variant = variantResponse.data.variant;
          const inventoryItemId = variant.inventory_item_id;

          if (inventoryItemId) {
            const inventoryResponse = await axios.get(
              `https://${shop}/admin/api/2024-10/inventory_items/${inventoryItemId}.json`,
              {
                headers: {
                  'X-Shopify-Access-Token': session.accessToken,
                },
              }
            );

            const cost = parseFloat(inventoryResponse.data.inventory_item.cost || 0);
            variantCosts[variantId] = cost;
          }
        }
      } catch (error) {
        console.error('Error fetching product costs:', error);
      }
    }

    // Calculate total cost based on ordered quantities
    orders.forEach((order: any) => {
      order.line_items?.forEach((item: any) => {
        const variantId = item.variant_id?.toString();
        const quantity = item.quantity || 0;
        const cost = variantCosts[variantId] || 0;
        totalCost += cost * quantity;
      });
    });

    // Calculate Gross Profit
    const grossProfit = totalRevenue - totalCost;

    // Fetch expenses for the date range
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .eq('shop', shop)
      .gte('expense_date', startDate.toISOString().split('T')[0])
      .lte('expense_date', endDate.toISOString().split('T')[0]);

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
    }

    const totalExpenses = (expenses || []).reduce(
      (sum, expense) => sum + parseFloat(expense.amount || 0),
      0
    );

    // Calculate Net Profit
    const netProfit = grossProfit - totalExpenses;

    return NextResponse.json({
      success: true,
      dateRange,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      currency: orders[0]?.currency || 'NPR',
      revenue: totalRevenue.toFixed(2),
      costOfGoods: totalCost.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      expenses: totalExpenses.toFixed(2),
      netProfit: netProfit.toFixed(2),
      ordersCount: orders.length,
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

