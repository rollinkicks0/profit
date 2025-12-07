import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';

export const dynamic = 'force-dynamic';

/**
 * Check if a shop is authenticated
 * Returns auth status and session info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    console.log('🔐 [AUTH-CHECK] Checking auth for shop:', shop);

    if (!shop) {
      console.error('❌ [AUTH-CHECK] Missing shop parameter');
      return NextResponse.json(
        { authenticated: false, error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Check if we have a valid session for this shop
    console.log('🔐 [AUTH-CHECK] Calling sessionStorage.findSessionsByShop...');
    const sessions = await sessionStorage.findSessionsByShop(shop);
    console.log('🔐 [AUTH-CHECK] Found sessions:', sessions.length);
    
    if (sessions.length === 0) {
      console.error('❌ [AUTH-CHECK] No sessions found in array');
      return NextResponse.json({
        authenticated: false,
        message: 'No session found for this shop',
        shop,
        debug: 'Session lookup returned empty array'
      });
    }

    const session = sessions[0];
    console.log('🔐 [AUTH-CHECK] First session:', {
      id: session.id,
      shop: session.shop,
      hasToken: !!session.accessToken
    });
    
    if (!session.accessToken) {
      console.error('❌ [AUTH-CHECK] Session has no access token');
      return NextResponse.json({
        authenticated: false,
        message: 'Session exists but no access token',
        sessionId: session.id
      });
    }

    console.log('✅ [AUTH-CHECK] Valid session found!');
    return NextResponse.json({
      authenticated: true,
      shop: session.shop,
      scope: session.scope,
      message: 'Valid session found',
    });

  } catch (error: any) {
    console.error('❌ [AUTH-CHECK] Exception:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Failed to check authentication',
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}

