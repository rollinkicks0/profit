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

    // Fetch locations first
    const locationsResponse = await axios.get(
      `https://${shop}/admin/api/2024-10/locations.json`,
      {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
      }
    );
    const locations = locationsResponse.data.locations || [];
    const locationMap: any = {};
    locations.forEach((loc: any) => {
      locationMap[loc.id] = loc.name;
    });

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

    console.log('=== ORDER COST FETCHING DEBUG ===');
    console.log('Total orders:', orders.length);
    console.log('Total unique variants to fetch:', variantIds.size);
    console.log('Variant IDs:', Array.from(variantIds));

    // Fetch variant costs - one by one for reliability (variants with sizes/colors)
    const variantCosts: { [key: string]: number } = {};
    
    if (variantIds.size > 0) {
      console.log('Fetching costs for', variantIds.size, 'variants');
      
      // Process in smaller batches to avoid API limits
      const variantIdsArray = Array.from(variantIds);
      const batchSize = 50;
      
      for (let i = 0; i < variantIdsArray.length; i += batchSize) {
        const batch = variantIdsArray.slice(i, i + batchSize);
        
        try {
          // Fetch variants in batch
          const variantsUrl = `https://${shop}/admin/api/2024-10/variants.json?ids=${batch.join(',')}`;
          console.log(`Fetching variants from: ${variantsUrl}`);
          
          const variantsResponse = await axios.get(variantsUrl, {
            headers: {
              'X-Shopify-Access-Token': session.accessToken,
            },
          });

          const variants = variantsResponse.data.variants || [];
          console.log(`Batch ${i}: Got ${variants.length} variants from API`);
          console.log('Variants data:', JSON.stringify(variants.map((v: any) => ({
            id: v.id,
            title: v.title,
            inventory_item_id: v.inventory_item_id
          })), null, 2));
          
          // Get inventory item IDs
          const invItemIds = variants
            .map((v: any) => v.inventory_item_id)
            .filter(Boolean);

          if (invItemIds.length > 0) {
            // Fetch inventory items
            const invUrl = `https://${shop}/admin/api/2024-10/inventory_items.json?ids=${invItemIds.join(',')}`;
            console.log(`Fetching inventory items from: ${invUrl}`);
            
            const invItemsResponse = await axios.get(invUrl, {
              headers: {
                'X-Shopify-Access-Token': session.accessToken,
              },
            });

            const inventoryItems = invItemsResponse.data.inventory_items || [];
            console.log(`Batch ${i}: Got ${inventoryItems.length} inventory items from API`);
            console.log('Inventory items:', JSON.stringify(inventoryItems.map((item: any) => ({
              id: item.id,
              cost: item.cost,
              sku: item.sku
            })), null, 2));
            
            // Map costs to variant IDs
            variants.forEach((variant: any) => {
              const invItem = inventoryItems.find((item: any) => 
                item.id === variant.inventory_item_id
              );
              if (invItem && invItem.cost) {
                const cost = parseFloat(invItem.cost);
                variantCosts[variant.id.toString()] = cost;
                console.log(`Variant ${variant.id}: Cost = ${cost}`);
              }
            });
          }
        } catch (error: any) {
          console.error('Error fetching batch costs:', error.response?.data || error.message);
        }
      }
      
      console.log('Total variant costs fetched:', Object.keys(variantCosts).length);
    }

    // Calculate cost price for each order and include line items
    const ordersWithCosts = orders.map((order: any) => {
      let totalCost = 0;
      let itemCount = 0;

      const lineItems = (order.line_items || []).map((item: any) => {
        const variantId = item.variant_id?.toString();
        const quantity = item.quantity || 0;
        const unitCost = variantCosts[variantId] || 0;
        const itemTotalCost = unitCost * quantity;
        
        totalCost += itemTotalCost;
        itemCount += quantity;
        
        if (variantId && !variantCosts[variantId]) {
          console.log(`Missing cost for variant ${variantId} in order ${order.name}`);
        }

        return {
          productName: item.name,
          variantTitle: item.variant_title,
          quantity: quantity,
          price: parseFloat(item.price || 0),
          unitCost: unitCost,
          totalCost: itemTotalCost,
          variantId: item.variant_id,
          sku: item.sku,
        };
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
        locationName: locationMap[order.location_id] || 'Unknown',
        lineItems: lineItems,
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

