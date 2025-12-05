import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { sessionStorage } from '@/lib/session-storage';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { shop, productId } = await request.json();

    if (!shop || !productId) {
      return NextResponse.json(
        { error: 'Missing shop or productId parameter' },
        { status: 400 }
      );
    }

    // Get session
    const session = await sessionStorage.loadSession(`offline_${shop}`);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`🔄 [SYNC PRODUCT] Syncing product ${productId} with prices`);

    // Fetch product details from Shopify
    const productResponse = await axios.get(
      `https://${shop}/admin/api/2024-10/products/${productId}.json`,
      {
        headers: { 'X-Shopify-Access-Token': session.accessToken },
      }
    );

    const shopifyProduct = productResponse.data.product;

    // Get all inventory item IDs to fetch costs
    const inventoryItemIds = shopifyProduct.variants
      .map((v: any) => v.inventory_item_id)
      .filter(Boolean);

    // Fetch inventory items for costs
    let inventoryItems: any[] = [];
    if (inventoryItemIds.length > 0) {
      const inventoryResponse = await axios.get(
        `https://${shop}/admin/api/2024-10/inventory_items.json?ids=${inventoryItemIds.join(',')}`,
        {
          headers: { 'X-Shopify-Access-Token': session.accessToken },
        }
      );
      inventoryItems = inventoryResponse.data.inventory_items || [];
    }

    // Create a map of inventory item costs
    const costMap: { [key: string]: number } = {};
    inventoryItems.forEach((item: any) => {
      costMap[item.id] = parseFloat(item.cost || 0);
    });

    // Upsert product
    const { data: product, error: productError } = await supabase
      .from('products')
      .upsert({
        shopify_product_id: shopifyProduct.id,
        title: shopifyProduct.title,
        handle: shopifyProduct.handle,
        status: shopifyProduct.status,
        product_type: shopifyProduct.product_type,
        vendor: shopifyProduct.vendor,
        tags: shopifyProduct.tags,
        image_url: shopifyProduct.image?.src || null,
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'shopify_product_id',
      })
      .select()
      .single();

    if (productError) {
      throw new Error(`Failed to upsert product: ${productError.message}`);
    }

    // Upsert variants with prices
    let variantsSynced = 0;
    for (const variant of shopifyProduct.variants) {
      const cost = costMap[variant.inventory_item_id] || 0;

      const { error: variantError } = await supabase
        .from('product_variants')
        .upsert({
          product_id: product.id,
          shopify_product_id: shopifyProduct.id,
          shopify_variant_id: variant.id,
          inventory_item_id: variant.inventory_item_id,
          title: variant.title,
          sku: variant.sku || null,
          price: parseFloat(variant.price || 0),
          cost: cost,
          compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
          position: variant.position,
          option1: variant.option1,
          option2: variant.option2,
          option3: variant.option3,
          image_url: variant.image_id ? shopifyProduct.image?.src : null,
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'shopify_variant_id',
        });

      if (variantError) {
        console.error(`❌ Failed to sync variant ${variant.id}:`, variantError);
      } else {
        variantsSynced++;
      }
    }

    console.log(`✅ [SYNC PRODUCT] ${shopifyProduct.title}: ${variantsSynced} variants synced`);

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
      },
      variantsSynced,
    });

  } catch (error: any) {
    console.error('❌ [SYNC PRODUCT] Error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

