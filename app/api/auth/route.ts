import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const redirectAfterAuth = searchParams.get('redirect');

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

    // Get environment variables
    const apiKey = process.env.SHOPIFY_API_KEY;
    
    // Build redirect URI with optional redirect path
    let redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    if (redirectAfterAuth) {
      redirectUri += `?redirect=${encodeURIComponent(redirectAfterAuth)}`;
    }
    
    const scopes = 'read_orders,read_locations,read_products,read_inventory,read_price_rules,read_discounts';
    
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(7);
    
    console.log('Auth initiation - Will redirect back to:', redirectAfterAuth || 'dashboard');
    
    // Build the OAuth URL manually
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` + 
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth', details: error.message },
      { status: 500 }
    );
  }
}

