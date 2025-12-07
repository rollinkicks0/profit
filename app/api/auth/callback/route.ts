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
    const error = searchParams.get('error');

    console.log('🔄 [CALLBACK] Received OAuth callback:', { shop, hasCode: !!code, state, error });

    // Check for OAuth errors from Shopify
    if (error) {
      const errorDescription = searchParams.get('error_description');
      console.error('❌ [CALLBACK] Shopify OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/?shop=${shop}&auth_error=${error}&error_description=${errorDescription}`, request.url)
      );
    }

    if (!code || !shop) {
      console.error('❌ [CALLBACK] Missing required parameters:', { code: !!code, shop });
      throw new Error('Missing required OAuth parameters (code or shop)');
    }

    // Exchange code for access token
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    
    console.log('🔄 [CALLBACK] Exchanging code for token:', { 
      shop, 
      apiKey: apiKey?.substring(0, 10) + '...', 
      redirectUri 
    });
    
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }
    );

    console.log('🔄 [CALLBACK] Token response received:', { 
      hasToken: !!tokenResponse.data.access_token,
      scope: tokenResponse.data.scope 
    });

    const { access_token, scope } = tokenResponse.data;

    if (!access_token) {
      console.error('❌ [CALLBACK] No access token in response');
      throw new Error('Failed to get access token from Shopify');
    }

    console.log('✅ [CALLBACK] Access token received, storing session...');

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
      console.error('❌ [CALLBACK] Failed to store session in database');
      throw new Error('Failed to store session in database');
    }

    console.log('✅ [CALLBACK] Session stored successfully for shop:', shop);

    // Redirect back to app
    const host = searchParams.get('host');
    const redirectUrl = `/?shop=${shop}${host ? `&host=${host}` : ''}&auth_success=true`;
    
    console.log('✅ [CALLBACK] Redirecting to:', redirectUrl);
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error: any) {
    console.error('❌ [CALLBACK] Error:', error.message);
    console.error('❌ [CALLBACK] Error details:', error.response?.data);
    
    const shop = new URL(request.url).searchParams.get('shop');
    
    return NextResponse.redirect(
      new URL(`/?shop=${shop}&auth_error=callback_failed&error_message=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

