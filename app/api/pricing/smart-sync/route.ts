import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large syncs

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to delay between API calls (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  const { shop } = await req.json();

  if (!shop) {
    return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
  }

  const session = await sessionStorage.loadSession(`offline_${shop}`);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  console.log('🔄 [SMART SYNC] Starting smart sync process...');

  try {
    const stats = {
      productsChecked: 0,
      productsUpdated: 0,
      variantsChecked: 0,
      variantsUpdated: 0,
      priceChanges: 0,
      costChanges: 0,
      newProductsFound: 0,
      errors: [] as string[],
    };

    // Step 1: Fetch all products from Shopify
    console.log('📥 [SMART SYNC] Fetching products from Shopify...');
    let allShopifyProducts: any[] = [];
    let pageInfo: string | null = null;

    do {
      const params: any = { limit: 250 };
      if (pageInfo) params.page_info = pageInfo;

      const response = await axios.get(
        `https://${shop}/admin/api/2024-10/products.json`,
        {
          headers: { 'X-Shopify-Access-Token': session.accessToken },
          params,
        }
      );

      allShopifyProducts = allShopifyProducts.concat(response.data.products || []);
      
      const linkHeader = response.headers.link;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          const nextUrl = new URL(nextMatch[1]);
          pageInfo = nextUrl.searchParams.get('page_info');
        } else {
          pageInfo = null;
        }
      } else {
        pageInfo = null;
      }

      await delay(300); // Rate limiting
    } while (pageInfo);

    console.log(`✅ [SMART SYNC] Fetched ${allShopifyProducts.length} products from Shopify`);

    // Step 2: Fetch all products from Supabase (by handle for matching)
    const { data: supabaseProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, handle, shopify_product_id, title, vendor, product_type, status, image_url');

    if (fetchError) {
      throw new Error(`Failed to fetch Supabase products: ${fetchError.message}`);
    }

    // Create handle map for quick lookup
    const supabaseProductMap = new Map(
      supabaseProducts?.map(p => [p.handle, p]) || []
    );

    console.log(`✅ [SMART SYNC] Found ${supabaseProducts?.length || 0} products in Supabase`);

    // Step 3: Process each Shopify product
    for (const shopifyProduct of allShopifyProducts) {
      stats.productsChecked++;
      const supabaseProduct = supabaseProductMap.get(shopifyProduct.handle);

      if (!supabaseProduct) {
        console.log(`🆕 [SMART SYNC] New product not in Supabase yet: ${shopifyProduct.handle}`);
        stats.newProductsFound++;
        continue; // Skip products not imported to Supabase yet
      }

      // Check if product details changed (Shopify is source of truth)
      const productNeedsUpdate =
        supabaseProduct.title !== shopifyProduct.title ||
        supabaseProduct.vendor !== shopifyProduct.vendor ||
        supabaseProduct.product_type !== shopifyProduct.product_type ||
        supabaseProduct.status !== shopifyProduct.status ||
        supabaseProduct.image_url !== shopifyProduct.image?.src ||
        !supabaseProduct.shopify_product_id;

      if (productNeedsUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            shopify_product_id: shopifyProduct.id,
            title: shopifyProduct.title,
            vendor: shopifyProduct.vendor,
            product_type: shopifyProduct.product_type,
            status: shopifyProduct.status,
            image_url: shopifyProduct.image?.src || null,
            last_synced_at: new Date().toISOString(),
          })
          .eq('handle', shopifyProduct.handle);

        if (updateError) {
          console.error(`❌ [SMART SYNC] Error updating product ${shopifyProduct.handle}:`, updateError);
          stats.errors.push(`Product ${shopifyProduct.handle}: ${updateError.message}`);
        } else {
          console.log(`✅ [SMART SYNC] Updated product: ${shopifyProduct.handle}`);
          stats.productsUpdated++;
        }
      }

      // Step 4: Process variants for this product
      const { data: supabaseVariants } = await supabase
        .from('product_variants')
        .select('id, sku, option1_value, option2_value, option3_value, price, cost, shopify_variant_id, inventory_item_id')
        .eq('handle', shopifyProduct.handle);

      for (const shopifyVariant of shopifyProduct.variants || []) {
        stats.variantsChecked++;

        // Match variant by SKU first, then by option values
        const supabaseVariant = supabaseVariants?.find(sv => 
          (sv.sku && sv.sku === shopifyVariant.sku) ||
          (sv.option1_value === shopifyVariant.option1 &&
           sv.option2_value === shopifyVariant.option2 &&
           sv.option3_value === shopifyVariant.option3)
        );

        if (!supabaseVariant) {
          console.log(`⚠️ [SMART SYNC] Variant not found in Supabase: ${shopifyVariant.sku || shopifyVariant.title}`);
          continue;
        }

        // Fetch cost from Shopify inventory (source of truth)
        let shopifyCost = 0;
        try {
          if (shopifyVariant.inventory_item_id) {
            const inventoryResponse = await axios.get(
              `https://${shop}/admin/api/2024-10/inventory_items/${shopifyVariant.inventory_item_id}.json`,
              {
                headers: { 'X-Shopify-Access-Token': session.accessToken },
              }
            );
            shopifyCost = parseFloat(inventoryResponse.data.inventory_item.cost || 0);
            await delay(200); // Rate limiting
          }
        } catch (error: any) {
          console.warn(`⚠️ [SMART SYNC] Could not fetch cost for variant ${shopifyVariant.id}: ${error.message}`);
        }

        const shopifyPrice = parseFloat(shopifyVariant.price);
        const supabasePrice = parseFloat(supabaseVariant.price || 0);
        const supabaseCost = parseFloat(supabaseVariant.cost || 0);

        // Compare prices (allow 0.01 tolerance for rounding)
        const priceChanged = Math.abs(shopifyPrice - supabasePrice) > 0.01;
        const costChanged = Math.abs(shopifyCost - supabaseCost) > 0.01;

        if (priceChanged || costChanged || !supabaseVariant.shopify_variant_id) {
          const updateData: any = {
            shopify_variant_id: shopifyVariant.id,
            shopify_product_id: shopifyProduct.id,
            inventory_item_id: shopifyVariant.inventory_item_id,
            last_synced_at: new Date().toISOString(),
          };

          if (priceChanged) {
            updateData.price = shopifyPrice;
            updateData.last_price_change = new Date().toISOString();
            stats.priceChanges++;
            console.log(`💰 [PRICE CHANGE] ${shopifyProduct.handle} - ${shopifyVariant.sku}: NPR ${supabasePrice} → NPR ${shopifyPrice}`);
          }

          if (costChanged) {
            updateData.cost = shopifyCost;
            updateData.last_cost_change = new Date().toISOString();
            stats.costChanges++;
            console.log(`💵 [COST CHANGE] ${shopifyProduct.handle} - ${shopifyVariant.sku}: NPR ${supabaseCost} → NPR ${shopifyCost}`);
          }

          const { error: variantUpdateError } = await supabase
            .from('product_variants')
            .update(updateData)
            .eq('id', supabaseVariant.id);

          if (variantUpdateError) {
            console.error(`❌ [SMART SYNC] Error updating variant:`, variantUpdateError);
            stats.errors.push(`Variant ${shopifyVariant.sku}: ${variantUpdateError.message}`);
          } else {
            stats.variantsUpdated++;
          }
        }
      }

      // Small delay between products
      await delay(100);
    }

    console.log('✅ [SMART SYNC] Sync completed!', stats);

    return NextResponse.json({
      success: true,
      message: `Smart sync completed successfully`,
      stats: {
        productsChecked: stats.productsChecked,
        productsUpdated: stats.productsUpdated,
        variantsChecked: stats.variantsChecked,
        variantsUpdated: stats.variantsUpdated,
        priceChanges: stats.priceChanges,
        costChanges: stats.costChanges,
        newProductsFound: stats.newProductsFound,
        errors: stats.errors.length,
        errorDetails: stats.errors.slice(0, 10), // First 10 errors only
      }
    });

  } catch (error: any) {
    console.error('❌ [SMART SYNC] Error:', error);
    return NextResponse.json({
      error: 'Failed to sync products',
      details: error.message || error.response?.data,
    }, { status: 500 });
  }
}

