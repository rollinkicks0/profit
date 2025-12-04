import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { sessionStorage } from '@/lib/session-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Complete OAuth flow
    const callback = await shopify.auth.callback({
      rawRequest: request as any,
    });

    const { session } = callback;

    if (!session || !session.accessToken) {
      throw new Error('Failed to get access token');
    }

    // Store session
    await sessionStorage.storeSession({
      id: session.id,
      shop: session.shop,
      state: session.state,
      accessToken: session.accessToken,
      isOnline: session.isOnline,
    });

    // Redirect to main app page
    const host = searchParams.get('host');
    const redirectUrl = `/?shop=${session.shop}${host ? `&host=${host}` : ''}`;
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  }
}

