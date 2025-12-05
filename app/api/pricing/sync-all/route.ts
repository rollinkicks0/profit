import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { sessionStorage } from '@/lib/session-storage';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Extended timeout for large syncs

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { shop } = await request.json();

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    // Get session
    const session = await sessionStorage.loadSession(`offline_${shop}`);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`🔄 [SYNC ALL] Starting full product sync for ${shop}`);

    // Fetch all products from Shopify (paginated)
    let allProducts: any[] = [];
    let pageInfo = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const params: any = { limit: 250, status: 'active' };
      if (pageInfo) {
        params.page_info = pageInfo;
      }

      const response = await axios.get(
        `https://${shop}/admin/api/2024-10/products.json`,
        {
          headers: { 'X-Shopify-Access-Token': session.accessToken },
          params,
        }
      );

      allProducts = allProducts.concat(response.data.products || []);

      // Check for next page (simplified - in production use Link header)
      hasNextPage = response.data.products.length === 250;
      pageInfo = null; // Implement proper pagination if needed
      
      if (response.data.products.length < 250) {
        hasNextPage = false;
      }
    }

    console.log(`📦 [SYNC ALL] Found ${allProducts.length} products in Shopify`);

    let productsAdded = 0;
    let productsUpdated = 0;

    // Process each product
    for (const shopifyProduct of allProducts) {
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
        console.error(`❌ Failed to sync product ${shopifyProduct.id}:`, productError);
        continue;
      }

      if (product) {
        productsAdded++;
      } else {
        productsUpdated++;
      }
    }

    console.log(`✅ [SYNC ALL] Complete: ${productsAdded} added/updated`);

    return NextResponse.json({
      success: true,
      productsProcessed: allProducts.length,
      productsAdded,
      productsUpdated,
    });

  } catch (error: any) {
    console.error('❌ [SYNC ALL] Error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

