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

    console.log(`🔍 [FETCH COST] Variant ${variantId} - Starting...`);

    // Step 1: Get variant details to get inventory_item_id
    let variant;
    try {
      const variantResponse = await axios.get(
        `https://${shop}/admin/api/2024-10/variants/${variantId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
          },
        }
      );
      variant = variantResponse.data.variant;
      console.log(`✅ [STEP 1] Variant ${variantId}:`, {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        inventory_item_id: variant.inventory_item_id,
        inventory_management: variant.inventory_management,
      });
    } catch (error: any) {
      console.error(`❌ [STEP 1 FAILED] Variant ${variantId}:`, error.response?.data || error.message);
      return NextResponse.json({
        success: false,
        cost: 0,
        error: 'Failed to fetch variant',
        details: error.response?.data || error.message,
      });
    }

    const inventoryItemId = variant.inventory_item_id;

    if (!inventoryItemId) {
      console.log(`⚠️ [NO INVENTORY ITEM] Variant ${variantId} has no inventory_item_id`);
      return NextResponse.json({
        success: true,
        cost: 0,
        message: 'No inventory item',
      });
    }

    // Step 2: Get inventory item to get cost
    let inventoryItem;
    try {
      const inventoryResponse = await axios.get(
        `https://${shop}/admin/api/2024-10/inventory_items/${inventoryItemId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
          },
        }
      );
      inventoryItem = inventoryResponse.data.inventory_item;
      console.log(`✅ [STEP 2] Inventory Item ${inventoryItemId}:`, {
        id: inventoryItem.id,
        cost: inventoryItem.cost,
        sku: inventoryItem.sku,
        tracked: inventoryItem.tracked,
      });
    } catch (error: any) {
      console.error(`❌ [STEP 2 FAILED] Inventory Item ${inventoryItemId}:`, error.response?.data || error.message);
      return NextResponse.json({
        success: false,
        cost: 0,
        error: 'Failed to fetch inventory item',
        details: error.response?.data || error.message,
      });
    }

    const cost = parseFloat(inventoryItem.cost || 0);

    console.log(`✅ [SUCCESS] Variant ${variantId} -> Cost: ${cost}`);

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

