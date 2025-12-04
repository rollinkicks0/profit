import axios from 'axios';

export interface OrdersCountResponse {
  count: number;
  orders: any[];
}

export async function getOrdersToday(
  shop: string,
  accessToken: string
): Promise<OrdersCountResponse> {
  try {
    // Get today's date at midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Shopify Admin API endpoint
    const url = `https://${shop}/admin/api/2024-10/orders.json`;
    
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      params: {
        status: 'any',
        created_at_min: todayISO,
        limit: 250, // Max limit per request
      },
    });

    const orders = response.data.orders || [];
    
    return {
      count: orders.length,
      orders: orders,
    };
  } catch (error: any) {
    console.error('Error fetching orders:', error.response?.data || error.message);
    throw new Error('Failed to fetch orders from Shopify');
  }
}

