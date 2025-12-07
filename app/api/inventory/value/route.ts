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

    console.log('Fetching inventory value for shop:', shop);

    // Fetch all locations
    const locationsResponse = await axios.get(
      `https://${shop}/admin/api/2024-10/locations.json`,
      {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
      }
    );
    const locations = locationsResponse.data.locations || [];
    const activeLocations = locations.filter((loc: any) => loc.active);

    // Fetch all products with variants
    let allProducts: any[] = [];
    let nextPageUrl: string | null = `https://${shop}/admin/api/2024-10/products.json?limit=250&fields=id,title,variants,image`;
    
    while (nextPageUrl) {
      const response: any = await axios.get(nextPageUrl, {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
      });
      
      allProducts = [...allProducts, ...response.data.products];
      
      // Check for next page
      const linkHeader = response.headers['link'];
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        nextPageUrl = match ? match[1] : null;
      } else {
        nextPageUrl = null;
      }
    }

    console.log(`Fetched ${allProducts.length} products`);

    // Calculate store value (simplified - by product, not variant)
    const productsWithInventory: any[] = [];
    let totalValue = 0;
    let totalUnits = 0;
    let productsWithStock = 0;

    for (const product of allProducts) {
      // Get base price (from first variant or cheapest variant)
      const basePrice = product.variants && product.variants.length > 0
        ? parseFloat(product.variants[0].price || 0)
        : 0;

      // Calculate total stock across all variants
      let totalProductStock = 0;
      const locationBreakdown: { [locationName: string]: number } = {};

      for (const variant of product.variants || []) {
        try {
          // Fetch inventory levels for this variant
          const inventoryItemId = variant.inventory_item_id;
          
          if (inventoryItemId) {
            const inventoryResponse = await axios.get(
              `https://${shop}/admin/api/2024-10/inventory_levels.json?inventory_item_ids=${inventoryItemId}`,
              {
                headers: {
                  'X-Shopify-Access-Token': session.accessToken,
                },
              }
            );

            inventoryResponse.data.inventory_levels?.forEach((level: any) => {
              if (level.available > 0) {
                totalProductStock += level.available;
                
                // Track by location
                const location = activeLocations.find((loc: any) => loc.id === level.location_id);
                if (location) {
                  locationBreakdown[location.name] = (locationBreakdown[location.name] || 0) + level.available;
                }
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching inventory for variant ${variant.id}:`, error);
        }
      }

      // Only include products with stock > 0
      if (totalProductStock > 0) {
        const productValue = basePrice * totalProductStock;
        totalValue += productValue;
        totalUnits += totalProductStock;
        productsWithStock++;

        productsWithInventory.push({
          productId: product.id,
          productTitle: product.title,
          productImage: product.image?.src || null,
          basePrice: basePrice.toFixed(2),
          totalStock: totalProductStock,
          value: productValue.toFixed(2),
          variantCount: product.variants?.length || 0,
          locationBreakdown: Object.entries(locationBreakdown).map(([name, qty]) => ({
            locationName: name,
            quantity: qty,
          })),
        });
      }
    }

    // Sort by value (highest first)
    productsWithInventory.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

    console.log(`Found ${productsWithStock} products with stock, total value: ${totalValue}`);

    return NextResponse.json({
      success: true,
      currency: 'NPR',
      totalValue: totalValue.toFixed(2),
      totalUnits,
      totalProducts: productsWithStock,
      products: productsWithInventory,
      locations: activeLocations.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
      })),
    });
  } catch (error: any) {
    console.error('Error calculating inventory value:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to calculate inventory value',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
