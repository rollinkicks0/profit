import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { sessionStorage } from '@/lib/session-storage';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
    }

    // Get session for Shopify API calls
    const session = await sessionStorage.loadSession(`offline_${shop}`);
    
    let shopifyStats = {
      totalProducts: 0,
      totalVariants: 0,
      error: null as string | null,
    };

    // Fetch Shopify stats if authenticated
    if (session && session.accessToken) {
      try {
        // Get product count from Shopify
        const productsResponse = await axios.get(
          `https://${shop}/admin/api/2024-10/products/count.json`,
          {
            headers: { 'X-Shopify-Access-Token': session.accessToken },
          }
        );
        shopifyStats.totalProducts = productsResponse.data.count || 0;

        // Get sample products to count variants (Shopify doesn't have a variants count endpoint)
        const allProductsResponse = await axios.get(
          `https://${shop}/admin/api/2024-10/products.json`,
          {
            headers: { 'X-Shopify-Access-Token': session.accessToken },
            params: { limit: 250, fields: 'variants' },
          }
        );

        const products = allProductsResponse.data.products || [];
        shopifyStats.totalVariants = products.reduce(
          (sum: number, product: any) => sum + (product.variants?.length || 0),
          0
        );
      } catch (error: any) {
        console.error('Error fetching Shopify stats:', error);
        shopifyStats.error = 'Not authenticated or API error';
      }
    } else {
      shopifyStats.error = 'Not authenticated';
    }

    // Get Supabase stats - Direct queries
    // Count total products
    const { count: totalProducts, error: productsCountError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productsCountError) {
      console.error('❌ Error counting products:', productsCountError);
    }

    // Count total variants
    const { count: totalVariants, error: variantsCountError } = await supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true });

    if (variantsCountError) {
      console.error('❌ Error counting variants:', variantsCountError);
    }

    console.log('📊 Supabase counts:', { totalProducts, totalVariants });

    // Count synced products (those with shopify_product_id)
    const { count: syncedProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .not('shopify_product_id', 'is', null);

    // Count synced variants (those with shopify_variant_id)
    const { count: syncedVariants } = await supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true })
      .not('shopify_variant_id', 'is', null);

    // Count variants needing sync
    const { count: variantsNeedingSync } = await supabase
      .from('product_variants')
      .select('*', { count: 'exact', head: true })
      .eq('needs_sync', true);

    // Get last sync time
    const { data: lastSyncData } = await supabase
      .from('product_variants')
      .select('last_synced_at')
      .not('last_synced_at', 'is', null)
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      shopify: {
        totalProducts: shopifyStats.totalProducts,
        totalVariants: shopifyStats.totalVariants,
        error: shopifyStats.error,
      },
      supabase: {
        totalProducts: totalProducts || 0,
        totalVariants: totalVariants || 0,
        syncedProducts: syncedProducts || 0,
        syncedVariants: syncedVariants || 0,
        variantsNeedingSync: variantsNeedingSync || 0,
        lastSyncTime: lastSyncData?.last_synced_at || null,
      },
      syncStatus: {
        productsMatched: syncedProducts || 0,
        variantsMatched: syncedVariants || 0,
        pendingSync: variantsNeedingSync || 0,
      },
    });

  } catch (error: any) {
    console.error('❌ [PRICING STATS] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch pricing stats',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

