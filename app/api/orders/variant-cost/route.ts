import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { sessionStorage } from '@/lib/session-storage';

export const dynamic = 'force-dynamic';

async function fetchCostMethod1(shop: string, variantId: string, accessToken: string) {
  // METHOD 1: Direct variant → inventory item fetch
  console.log(`📍 [METHOD 1] Direct fetch for variant ${variantId}`);
  
  const variantResponse = await axios.get(
    `https://${shop}/admin/api/2024-10/variants/${variantId}.json`,
    {
      headers: { 'X-Shopify-Access-Token': accessToken },
    }
  );

  const variant = variantResponse.data.variant;
  const inventoryItemId = variant.inventory_item_id;

  if (!inventoryItemId) {
    throw new Error('No inventory_item_id');
  }

  const inventoryResponse = await axios.get(
    `https://${shop}/admin/api/2024-10/inventory_items/${inventoryItemId}.json`,
    {
      headers: { 'X-Shopify-Access-Token': accessToken },
    }
  );

  const cost = parseFloat(inventoryResponse.data.inventory_item.cost || 0);
  console.log(`✅ [METHOD 1] Success: ${cost}`);
  return { cost, method: 'direct', variant };
}

async function fetchCostMethod2(shop: string, variantId: string, accessToken: string) {
  // METHOD 2: Fetch via product (includes all variants)
  console.log(`📍 [METHOD 2] Fetch via product for variant ${variantId}`);
  
  // First get the variant to find product_id
  const variantResponse = await axios.get(
    `https://${shop}/admin/api/2024-10/variants/${variantId}.json`,
    {
      headers: { 'X-Shopify-Access-Token': accessToken },
    }
  );

  const variant = variantResponse.data.variant;
  const productId = variant.product_id;

  // Get full product with all variants
  const productResponse = await axios.get(
    `https://${shop}/admin/api/2024-10/products/${productId}.json`,
    {
      headers: { 'X-Shopify-Access-Token': accessToken },
    }
  );

  // Find our variant in the product
  const productVariant = productResponse.data.product.variants.find(
    (v: any) => v.id.toString() === variantId.toString()
  );

  if (!productVariant || !productVariant.inventory_item_id) {
    throw new Error('Variant not found in product');
  }

  const inventoryResponse = await axios.get(
    `https://${shop}/admin/api/2024-10/inventory_items/${productVariant.inventory_item_id}.json`,
    {
      headers: { 'X-Shopify-Access-Token': accessToken },
    }
  );

  const cost = parseFloat(inventoryResponse.data.inventory_item.cost || 0);
  console.log(`✅ [METHOD 2] Success: ${cost}`);
  return { cost, method: 'via_product', variant: productVariant };
}

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

    console.log(`🔍 [FETCH COST] Variant ${variantId} - Starting with fallback logic...`);

    // TRY METHOD 1: Direct fetch
    let result;
    try {
      result = await fetchCostMethod1(shop, variantId, session.accessToken);
      
      return NextResponse.json({
        success: true,
        cost: result.cost,
        variantId: variantId,
        method: result.method,
      });
    } catch (error1: any) {
      console.warn(`⚠️ [METHOD 1 FAILED] ${error1.message}`);
      
      // TRY METHOD 2: Via product
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
        result = await fetchCostMethod2(shop, variantId, session.accessToken);
        
        return NextResponse.json({
          success: true,
          cost: result.cost,
          variantId: variantId,
          method: result.method,
        });
      } catch (error2: any) {
        console.error(`❌ [METHOD 2 FAILED] ${error2.message}`);
        
        // ALL METHODS FAILED
        console.error(`❌ [ALL METHODS FAILED] Variant ${variantId}:`, {
          method1Error: error1.response?.data || error1.message,
          method2Error: error2.response?.data || error2.message,
        });
        
        return NextResponse.json({
          success: true, // Still return success to avoid breaking UI
          cost: 0,
          variantId: variantId,
          method: 'failed',
          error: 'All fetch methods failed',
        });
      }
    }

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

