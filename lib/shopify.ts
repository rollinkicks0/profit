import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: [
    'read_orders',
    'read_locations', 
    'read_products', 
    'read_inventory',
    'read_price_rules',
    'read_discounts'
  ],
  hostName: process.env.NEXT_PUBLIC_APP_URL!.replace(/https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

export interface ShopifySession {
  id: string;
  shop: string;
  state: string;
  accessToken?: string;
  isOnline: boolean;
}

