import { NextRequest, NextResponse } from 'next/server';
import { sessionStorage } from '@/lib/session-storage';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');
    const query = searchParams.get('query') || '';
    const productId = searchParams.get('productId');

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

    // If searching for products
    if (!productId && query) {
      const productsResponse = await axios.get(
        `https://${shop}/admin/api/2024-10/products.json`,
        {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
          },
          params: {
            limit: 250, // Fetch more products
            title: query, // Shopify title filter
            fields: 'id,title,image',
          },
        }
      );

      const products = productsResponse.data.products || [];
      
      // Also do client-side filtering for partial matches
      const filtered = products.filter((p: any) => 
        p.title.toLowerCase().includes(query.toLowerCase())
      );

      console.log('Search query:', query);
      console.log('Found products:', filtered.length);

      return NextResponse.json({
        success: true,
        products: filtered.slice(0, 20),
      });
    }

    // If getting specific product details
    if (productId) {
      const productResponse = await axios.get(
        `https://${shop}/admin/api/2024-10/products/${productId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
          },
        }
      );

      const product = productResponse.data.product;

      // Get locations
      const locationsResponse = await axios.get(
        `https://${shop}/admin/api/2024-10/locations.json`,
        {
          headers: {
            'X-Shopify-Access-Token': session.accessToken,
          },
        }
      );
      const locations = locationsResponse.data.locations || [];

      // Get variant details with costs and inventory
      const variantDetails = await Promise.all(
        product.variants.map(async (variant: any) => {
          try {
            // Get inventory item for cost
            const inventoryItemResponse = await axios.get(
              `https://${shop}/admin/api/2024-10/inventory_items/${variant.inventory_item_id}.json`,
              {
                headers: {
                  'X-Shopify-Access-Token': session.accessToken,
                },
              }
            );

            const inventoryItem = inventoryItemResponse.data.inventory_item;

            // Get inventory levels per location
            const inventoryLevelsResponse = await axios.get(
              `https://${shop}/admin/api/2024-10/inventory_levels.json`,
              {
                headers: {
                  'X-Shopify-Access-Token': session.accessToken,
                },
                params: {
                  inventory_item_ids: variant.inventory_item_id,
                },
              }
            );

            const levels = inventoryLevelsResponse.data.inventory_levels || [];
            
            // Map levels to locations
            const locationInventory = locations.map((loc: any) => {
              const level = levels.find((l: any) => l.location_id === loc.id);
              return {
                locationId: loc.id,
                locationName: loc.name,
                available: level?.available || 0,
              };
            });

            const totalAvailable = levels.reduce((sum: number, l: any) => 
              sum + (l.available || 0), 0
            );

            return {
              variantId: variant.id,
              variantTitle: variant.title,
              sku: variant.sku,
              price: parseFloat(variant.price || 0),
              cost: parseFloat(inventoryItem.cost || 0),
              inventoryItemId: variant.inventory_item_id,
              totalAvailable,
              locationInventory,
            };
          } catch (error) {
            console.error('Error fetching variant details:', error);
            return {
              variantId: variant.id,
              variantTitle: variant.title,
              sku: variant.sku,
              price: parseFloat(variant.price || 0),
              cost: 0,
              error: 'Failed to fetch cost',
              totalAvailable: 0,
              locationInventory: [],
            };
          }
        })
      );

      return NextResponse.json({
        success: true,
        product: {
          id: product.id,
          title: product.title,
          image: product.image?.src || null,
          variants: variantDetails,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Missing query or productId parameter',
    });
  } catch (error: any) {
    console.error('Error in product test:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch product data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

