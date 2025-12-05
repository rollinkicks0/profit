import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    // If productId provided, get product with variants
    if (productId) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (variantsError) throw variantsError;

      return NextResponse.json({
        success: true,
        product: {
          ...product,
          variants,
        },
      });
    }

    // Otherwise, get all products with summary
    const { data: products, error } = await supabase
      .from('product_pricing_summary')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      products: products || [],
    });

  } catch (error: any) {
    console.error('❌ [PRICING LIST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch pricing data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

