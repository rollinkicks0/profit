import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Validate shop domain
    const shopDomain = shop.includes('.myshopify.com') 
      ? shop 
      : `${shop}.myshopify.com`;

    // Generate OAuth URL
    const authRoute = await shopify.auth.begin({
      shop: shopDomain,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: request as any,
    });

    return NextResponse.redirect(authRoute);
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth', details: error.message },
      { status: 500 }
    );
  }
}

