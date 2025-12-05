import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const locationFilter = searchParams.get('location') || 'all';

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

    // Fetch orders (recent 250)
    const ordersResponse = await axios.get(
      `https://${shop}/admin/api/2024-10/orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
        params: {
          status: 'any',
          limit: 250,
          fields: 'id,name,created_at,total_price,currency,financial_status,fulfillment_status,line_items,location_id',
        },
      }
    );

    let orders = ordersResponse.data.orders || [];

    // Filter by location if specified
    if (locationFilter !== 'all') {
      orders = orders.filter((order: any) => 
        order.location_id === parseInt(locationFilter)
      );
    }

    // Get all variant IDs to fetch costs
    const variantIds = new Set<string>();
    orders.forEach((order: any) => {
      order.line_items?.forEach((item: any) => {
        if (item.variant_id) {
          variantIds.add(item.variant_id.toString());
        }
      });
    });

    // Fetch variant costs in batch
    const variantCosts: { [key: string]: number } = {};
    
    if (variantIds.size > 0) {
      try {
        const variantsResponse = await axios.get(
          `https://${shop}/admin/api/2024-10/variants.json?ids=${Array.from(variantIds).join(',')}`,
          {
            headers: {
              'X-Shopify-Access-Token': session.accessToken,
            },
          }
        );

        const variants = variantsResponse.data.variants || [];
        const invItemIds = variants.map((v: any) => v.inventory_item_id).filter(Boolean);

        if (invItemIds.length > 0) {
          const invItemsResponse = await axios.get(
            `https://${shop}/admin/api/2024-10/inventory_items.json?ids=${invItemIds.join(',')}`,
            {
              headers: {
                'X-Shopify-Access-Token': session.accessToken,
              },
            }
          );

          const inventoryItems = invItemsResponse.data.inventory_items || [];
          
          variants.forEach((variant: any) => {
            const invItem = inventoryItems.find((item: any) => 
              item.id === variant.inventory_item_id
            );
            if (invItem) {
              variantCosts[variant.id.toString()] = parseFloat(invItem.cost || 0);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching costs:', error);
      }
    }

    // Calculate cost price for each order
    const ordersWithCosts = orders.map((order: any) => {
      let totalCost = 0;
      let itemCount = 0;

      order.line_items?.forEach((item: any) => {
        const variantId = item.variant_id?.toString();
        const quantity = item.quantity || 0;
        const cost = variantCosts[variantId] || 0;
        totalCost += cost * quantity;
        itemCount += quantity;
      });

      return {
        id: order.id,
        orderNumber: order.name,
        createdAt: order.created_at,
        totalPrice: parseFloat(order.total_price || 0),
        totalCost: totalCost,
        currency: order.currency,
        paymentStatus: order.financial_status || 'pending',
        fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
        itemCount: itemCount,
        locationId: order.location_id,
      };
    });

    return NextResponse.json({
      success: true,
      orders: ordersWithCosts,
      currency: orders[0]?.currency || 'NPR',
    });
  } catch (error: any) {
    console.error('Error fetching orders list:', error);
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

