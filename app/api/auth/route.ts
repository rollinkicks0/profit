import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    console.log('🔐 [AUTH] Starting OAuth flow for shop:', shop);

    if (!shop) {
      console.error('❌ [AUTH] Missing shop parameter');
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Validate shop domain
    const shopDomain = shop.includes('.myshopify.com') 
      ? shop 
      : `${shop}.myshopify.com`;

    console.log('🔐 [AUTH] Validated shop domain:', shopDomain);

    // Get environment variables
    const apiKey = process.env.SHOPIFY_API_KEY;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    const scopes = 'read_orders,read_locations,read_products,read_inventory,read_price_rules,read_discounts';
    
    console.log('🔐 [AUTH] OAuth config:', {
      apiKey: apiKey?.substring(0, 10) + '...',
      redirectUri,
      scopes
    });
    
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(7);
    
    // Build the OAuth URL
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` + 
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    console.log('🔐 [AUTH] Redirecting to Shopify OAuth:', authUrl.substring(0, 100) + '...');

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('❌ [AUTH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth', details: error.message },
      { status: 500 }
    );
  }
}

