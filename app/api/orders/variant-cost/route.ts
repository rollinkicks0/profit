import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { sessionStorage } from '@/lib/session-storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    const variantId = searchParams.get('variantId');

    if (!shop || !variantId) {
      return NextResponse.json(
        { error: 'Missing shop or variantId parameter' },
        { status: 400 }
      );
    }

    // Get session
    const session = await sessionStorage.loadSession(`offline_${shop}`);
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log(`Fetching cost for variant ${variantId}`);

    // Step 1: Get variant details to get inventory_item_id
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

    console.log(`Variant ${variantId} -> Inventory Item ${inventoryItemId}`);

    if (!inventoryItemId) {
      return NextResponse.json({
        success: true,
        cost: 0,
        message: 'No inventory item',
      });
    }

    // Step 2: Get inventory item to get cost
    const inventoryResponse = await axios.get(
      `https://${shop}/admin/api/2024-10/inventory_items/${inventoryItemId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
      }
    );

    const inventoryItem = inventoryResponse.data.inventory_item;
    const cost = parseFloat(inventoryItem.cost || 0);

    console.log(`Inventory Item ${inventoryItemId} -> Cost: ${cost}`);

    return NextResponse.json({
      success: true,
      cost: cost,
      variantId: variantId,
      inventoryItemId: inventoryItemId,
    });

  } catch (error: any) {
    console.error('Error fetching variant cost:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: 'Failed to fetch cost',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

