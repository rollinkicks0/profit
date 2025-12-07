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

    console.log('✅ Access token received, storing session...');

    // Store session with extended info
    const sessionStored = await sessionStorage.storeSession({
      id: `offline_${shop}`,
      shop: shop,
      state: state || '',
      accessToken: access_token,
      isOnline: false,
      scope: scope,
      // Offline tokens don't expire, but set a far future date for consistency
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    });

    if (!sessionStored) {
      console.error('❌ Failed to store session');
      throw new Error('Failed to store session');
    }

    console.log('✅ Session stored successfully for shop:', shop);

    // Simple redirect back to app (localStorage will handle the page redirect)
    const host = searchParams.get('host');
    const redirectUrl = `/?shop=${shop}${host ? `&host=${host}` : ''}`;
    
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

