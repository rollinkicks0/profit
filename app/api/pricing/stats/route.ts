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

    // Get Supabase stats
    const { data: supabaseStats, error: supabaseError } = await supabase
      .rpc('get_sync_stats');

    if (supabaseError) {
      throw supabaseError;
    }

    const stats = supabaseStats?.[0] || {
      total_products: 0,
      total_variants: 0,
      synced_products: 0,
      synced_variants: 0,
      variants_needing_sync: 0,
      last_sync_time: null,
    };

    return NextResponse.json({
      success: true,
      shopify: {
        totalProducts: shopifyStats.totalProducts,
        totalVariants: shopifyStats.totalVariants,
        error: shopifyStats.error,
      },
      supabase: {
        totalProducts: parseInt(stats.total_products) || 0,
        totalVariants: parseInt(stats.total_variants) || 0,
        syncedProducts: parseInt(stats.synced_products) || 0,
        syncedVariants: parseInt(stats.synced_variants) || 0,
        variantsNeedingSync: parseInt(stats.variants_needing_sync) || 0,
        lastSyncTime: stats.last_sync_time,
      },
      syncStatus: {
        productsMatched: parseInt(stats.synced_products) || 0,
        variantsMatched: parseInt(stats.synced_variants) || 0,
        pendingSync: parseInt(stats.variants_needing_sync) || 0,
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

