import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import axios from 'axios';

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

    const sessions = await sessionStorage.findSessionsByShop(shop);
    const session = sessions[0];

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch locations from Shopify
    const response = await axios.get(
      `https://${shop}/admin/api/2024-10/locations.json`,
      {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
      }
    );

    const locations = response.data.locations || [];
    
    // Filter only active locations
    const activeLocations = locations.filter((loc: any) => loc.active);

    return NextResponse.json({
      success: true,
      locations: activeLocations.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: `${loc.address1 || ''}, ${loc.city || ''}`.trim(),
        active: loc.active,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch locations',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

