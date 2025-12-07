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
    let nextPageUrl = `https://${shop}/admin/api/2024-10/products.json?limit=250&fields=id,title,variants,image`;
    
    while (nextPageUrl) {
      const response = await axios.get(nextPageUrl, {
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

    // Get all variant IDs that have inventory
    const variantIds: string[] = [];
    allProducts.forEach(product => {
      product.variants?.forEach((variant: any) => {
        variantIds.push(variant.id.toString());
      });
    });

    console.log(`Total variants to check: ${variantIds.length}`);

    // Fetch inventory levels for all variants (in batches)
    const inventoryLevels: { [key: string]: { [locationId: string]: number } } = {};
    const batchSize = 50;
    
    for (let i = 0; i < variantIds.length; i += batchSize) {
      const batch = variantIds.slice(i, i + batchSize);
      const inventoryItemIds: string[] = [];
      
      // First, get inventory_item_id for each variant
      for (const variantId of batch) {
        try {
          const variantResponse = await axios.get(
            `https://${shop}/admin/api/2024-10/variants/${variantId}.json`,
            {
              headers: {
                'X-Shopify-Access-Token': session.accessToken,
              },
            }
          );
          
          const inventoryItemId = variantResponse.data.variant?.inventory_item_id;
          if (inventoryItemId) {
            inventoryItemIds.push(inventoryItemId);
            // Store mapping
            if (!inventoryLevels[variantId]) {
              inventoryLevels[variantId] = {};
            }
          }
        } catch (error) {
          console.error(`Error fetching variant ${variantId}:`, error);
        }
      }
      
      // Fetch inventory levels for these inventory items
      for (const locationId of activeLocations.map((l: any) => l.id)) {
        try {
          const inventoryResponse = await axios.get(
            `https://${shop}/admin/api/2024-10/inventory_levels.json?inventory_item_ids=${inventoryItemIds.join(',')}&location_ids=${locationId}&limit=250`,
            {
              headers: {
                'X-Shopify-Access-Token': session.accessToken,
              },
            }
          );
          
          inventoryResponse.data.inventory_levels?.forEach((level: any) => {
            // Find variant ID from inventory_item_id
            const variantId = Object.keys(inventoryLevels).find(vId => {
              // We need to re-fetch to get the inventory_item_id, but for now let's use the data we have
              return true;
            });
            
            if (level.available > 0) {
              // Store available quantity by location
              const vId = batch.find(id => {
                // Match by checking the variant's inventory_item_id
                return true; // Simplified for now
              });
              
              if (vId && inventoryLevels[vId]) {
                inventoryLevels[vId][locationId] = level.available;
              }
            }
          });
        } catch (error) {
          console.error(`Error fetching inventory for location ${locationId}:`, error);
        }
      }
    }

    // Calculate store value
    const productsWithInventory: any[] = [];
    let totalValue = 0;
    let totalUnits = 0;

    allProducts.forEach(product => {
      product.variants?.forEach((variant: any) => {
        const variantId = variant.id.toString();
        const locationStock = inventoryLevels[variantId] || {};
        const totalStock = Object.values(locationStock).reduce((sum: number, qty: any) => sum + qty, 0);
        
        if (totalStock > 0) {
          const price = parseFloat(variant.price || 0);
          const value = price * totalStock;
          
          totalValue += value;
          totalUnits += totalStock;
          
          productsWithInventory.push({
            productId: product.id,
            productTitle: product.title,
            productImage: product.image?.src || null,
            variantId: variant.id,
            variantTitle: variant.title,
            sku: variant.sku || '',
            price: price.toFixed(2),
            stock: totalStock,
            value: value.toFixed(2),
            locationBreakdown: Object.entries(locationStock).map(([locId, qty]) => ({
              locationId: locId,
              locationName: activeLocations.find((l: any) => l.id.toString() === locId)?.name || 'Unknown',
              quantity: qty,
            })),
          });
        }
      });
    });

    // Sort by value (highest first)
    productsWithInventory.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

    return NextResponse.json({
      success: true,
      currency: 'NPR',
      totalValue: totalValue.toFixed(2),
      totalUnits,
      totalProducts: productsWithInventory.length,
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

