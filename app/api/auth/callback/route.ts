import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');

    if (!code || !shop) {
      throw new Error('Missing required parameters');
    }

    // Exchange code for access token
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    
    console.log('Token exchange:', { shop, apiKey: apiKey?.substring(0, 10) + '...', redirectUri });
    
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }
    );

    const { access_token, scope } = tokenResponse.data;

    if (!access_token) {
      throw new Error('Failed to get access token');
    }

    // Store session
    await sessionStorage.storeSession({
      id: `offline_${shop}`,
      shop: shop,
      state: state || '',
      accessToken: access_token,
      isOnline: false,
    });

    // Get redirect path from query params or default to dashboard
    const redirectPath = searchParams.get('redirect') || `/?shop=${shop}`;
    const host = searchParams.get('host');
    
    // Build final redirect URL
    let redirectUrl = redirectPath;
    if (!redirectUrl.includes('shop=')) {
      redirectUrl += `${redirectUrl.includes('?') ? '&' : '?'}shop=${shop}`;
    }
    if (host) {
      redirectUrl += `&host=${host}`;
    }
    
    console.log('Auth callback - Redirecting to:', redirectUrl);
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error: any) {
    console.error('Callback error:', error);
    console.error('Error response:', error.response?.data);
    return NextResponse.json(
      { 
        error: 'Authentication failed', 
        details: error.response?.data?.error || error.message,
        fullError: error.response?.data 
      },
      { status: 500 }
    );
  }
}

