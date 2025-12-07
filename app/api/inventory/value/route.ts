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

    console.log('📦 Fetching inventory value for shop:', shop);

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
    console.log(`📍 Found ${activeLocations.length} active locations`);

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

    console.log(`✅ Fetched ${allProducts.length} products`);

    // Collect all inventory item IDs with their product mapping
    const inventoryItemMap: { [inventoryItemId: string]: { productId: any; variantId: any } } = {};
    
    allProducts.forEach(product => {
      product.variants?.forEach((variant: any) => {
        if (variant.inventory_item_id) {
          inventoryItemMap[variant.inventory_item_id] = {
            productId: product.id,
            variantId: variant.id,
          };
        }
      });
    });

    const allInventoryItemIds = Object.keys(inventoryItemMap);
    console.log(`📊 Total variants to check: ${allInventoryItemIds.length}`);

    // Fetch ALL inventory levels in batches (max 50 per request)
    const inventoryLevels: any[] = [];
    const batchSize = 50;

    for (let i = 0; i < allInventoryItemIds.length; i += batchSize) {
      const batch = allInventoryItemIds.slice(i, i + batchSize);
      
      try {
        const inventoryResponse = await axios.get(
          `https://${shop}/admin/api/2024-10/inventory_levels.json?inventory_item_ids=${batch.join(',')}&limit=250`,
          {
            headers: {
              'X-Shopify-Access-Token': session.accessToken,
            },
          }
        );
        
        inventoryLevels.push(...(inventoryResponse.data.inventory_levels || []));
        console.log(`📦 Fetched batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allInventoryItemIds.length / batchSize)}`);
      } catch (error) {
        console.error(`❌ Error fetching inventory batch:`, error);
      }
    }

    console.log(`✅ Total inventory levels fetched: ${inventoryLevels.length}`);

    // Group inventory by product
    const productStockMap: { [productId: string]: { total: number; byLocation: { [locName: string]: number } } } = {};

    inventoryLevels.forEach((level: any) => {
      if (level.available > 0) {
        const mapping = inventoryItemMap[level.inventory_item_id];
        if (mapping) {
          const productId = mapping.productId.toString();
          
          if (!productStockMap[productId]) {
            productStockMap[productId] = { total: 0, byLocation: {} };
          }
          
          productStockMap[productId].total += level.available;
          
          // Track by location
          const location = activeLocations.find((loc: any) => loc.id === level.location_id);
          if (location) {
            productStockMap[productId].byLocation[location.name] = 
              (productStockMap[productId].byLocation[location.name] || 0) + level.available;
          }
        }
      }
    });

    // Calculate store value
    const productsWithInventory: any[] = [];
    let totalValue = 0;
    let totalUnits = 0;

    allProducts.forEach(product => {
      const productId = product.id.toString();
      const stockData = productStockMap[productId];
      
      if (stockData && stockData.total > 0) {
        // Get base price (from first variant)
        const basePrice = product.variants && product.variants.length > 0
          ? parseFloat(product.variants[0].price || 0)
          : 0;

        const productValue = basePrice * stockData.total;
        totalValue += productValue;
        totalUnits += stockData.total;

        productsWithInventory.push({
          productId: product.id,
          productTitle: product.title,
          productImage: product.image?.src || null,
          basePrice: basePrice.toFixed(2),
          totalStock: stockData.total,
          value: productValue.toFixed(2),
          variantCount: product.variants?.length || 0,
          locationBreakdown: Object.entries(stockData.byLocation).map(([name, qty]) => ({
            locationName: name,
            quantity: qty,
          })),
        });
      }
    });

    // Sort by value (highest first)
    productsWithInventory.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

    console.log(`✅ Found ${productsWithInventory.length} products with stock`);
    console.log(`💰 Total inventory value: ${totalValue.toFixed(2)}`);

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
    console.error('❌ Error calculating inventory value:', error);
    console.error('Error details:', error.response?.data || error.message);
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
