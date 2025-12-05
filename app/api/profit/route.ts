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

    // Fetch all locations
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

    // Get all unique variant IDs from orders
    const variantIds = new Set<string>();
    orders.forEach((order: any) => {
      order.line_items?.forEach((item: any) => {
        if (item.variant_id) {
          variantIds.add(item.variant_id.toString());
        }
      });
    });

    // Fetch costs from Supabase (our pricing database)
    const variantCosts: { [key: string]: number } = {};
    
    if (variantIds.size > 0) {
      try {
        console.log('Fetching costs for', variantIds.size, 'variants from Supabase...');
        
        // Fetch all variant costs from Supabase in one query
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select('shopify_variant_id, cost')
          .in('shopify_variant_id', Array.from(variantIds));

        if (variantsError) {
          console.error('Error fetching variant costs from Supabase:', variantsError);
        } else if (variantsData) {
          // Map variant costs by shopify_variant_id
          variantsData.forEach((variant: any) => {
            if (variant.shopify_variant_id) {
              variantCosts[variant.shopify_variant_id.toString()] = parseFloat(variant.cost || 0);
            }
          });
          
          console.log(`Loaded ${Object.keys(variantCosts).length} variant costs from Supabase`);
        }
      } catch (error) {
        console.error('Error fetching product costs from Supabase:', error);
      }
    }

    // Fetch expenses for the date range (MUST BE BEFORE using it)
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop', shop)
      .gte('expense_date', startDate.toISOString().split('T')[0])
      .lte('expense_date', endDate.toISOString().split('T')[0]);

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
    }

    // Calculate location-based breakdown
    const locationData: any = {};
    
    activeLocations.forEach((loc: any) => {
      locationData[loc.id] = {
        locationId: loc.id,
        locationName: loc.name,
        revenue: 0,
        cost: 0,
        expenses: 0,
        orderCount: 0,
      };
    });

    // Group orders and costs by location
    orders.forEach((order: any) => {
      const locationId = order.location_id;
      
      if (locationId && locationData[locationId]) {
        // Add revenue
        locationData[locationId].revenue += parseFloat(order.total_price || 0);
        locationData[locationId].orderCount += 1;
        
        // Add costs
        order.line_items?.forEach((item: any) => {
          const variantId = item.variant_id?.toString();
          const quantity = item.quantity || 0;
          const cost = variantCosts[variantId] || 0;
          locationData[locationId].cost += cost * quantity;
        });
      }
    });

    // Add expenses by location
    expenses?.forEach((expense: any) => {
      // Find matching location
      const location = activeLocations.find((loc: any) => 
        loc.name === expense.location_name
      );
      
      if (location && locationData[location.id]) {
        locationData[location.id].expenses += parseFloat(expense.amount || 0);
      }
    });

    // Calculate totals and format location data
    let totalCost = 0;
    const locationBreakdown = Object.values(locationData).map((loc: any) => {
      totalCost += loc.cost;
      const grossProfit = loc.revenue - loc.cost;
      const netProfit = grossProfit - loc.expenses;
      
      return {
        locationId: loc.locationId,
        locationName: loc.locationName,
        revenue: loc.revenue.toFixed(2),
        cost: loc.cost.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        expenses: loc.expenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        orderCount: loc.orderCount,
      };
    });

    // Calculate Gross Profit
    const grossProfit = totalRevenue - totalCost;

    // Calculate total expenses
    const totalExpenses = (expenses || []).reduce(
      (sum: number, expense: any) => sum + parseFloat(expense.amount || 0),
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
      locationBreakdown,
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

