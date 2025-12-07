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

    if (!shop) {
      return NextResponse.json(
        { authenticated: false, error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Check if we have a valid session for this shop
    const sessions = await sessionStorage.findSessionsByShop(shop);
    
    if (sessions.length === 0) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found for this shop',
      });
    }

    const session = sessions[0];
    
    if (!session.accessToken) {
      return NextResponse.json({
        authenticated: false,
        message: 'Session exists but no access token',
      });
    }

    return NextResponse.json({
      authenticated: true,
      shop: session.shop,
      scope: session.scope,
      message: 'Valid session found',
    });

  } catch (error: any) {
    console.error('❌ Error checking auth:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Failed to check authentication',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

